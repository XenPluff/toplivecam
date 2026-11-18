import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL_APP = "decart/lucy-2-6/realtime";
const TOKEN_EXPIRATION_SECONDS = 120;

const json = (body: unknown, status: number, origin: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });

Deno.serve(async (request) => {
  const configuredOrigin = Deno.env.get("APP_ORIGIN");
  const requestOrigin = request.headers.get("Origin");

  if (!configuredOrigin) {
    return new Response("Server configuration error", { status: 500 });
  }

  const allowedOrigins = configuredOrigin.split(",").map((value) => value.trim()).filter(Boolean);
  if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
    return new Response("Forbidden origin", { status: 403 });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": requestOrigin,
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Vary": "Origin",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, requestOrigin);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) return json({ error: "Authentication required" }, 401, requestOrigin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const falKey = Deno.env.get("FAL_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !falKey) {
    return json({ error: "Server configuration incomplete" }, 500, requestOrigin);
  }

  let body: { app?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: "Request too large" }, 413, requestOrigin);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON body" }, 400, requestOrigin);
  }

  if (body.app !== MODEL_APP) {
    return json({ error: "Model not permitted" }, 403, requestOrigin);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !userData.user) {
    return json({ error: "Invalid or expired session" }, 401, requestOrigin);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: quotaRows, error: quotaError } = await adminClient.rpc(
    "consume_fal_token_quota",
    { p_user_id: userData.user.id },
  );

  if (quotaError || !quotaRows?.[0]) {
    return json({ error: "Unable to verify session quota" }, 503, requestOrigin);
  }
  if (!quotaRows[0].allowed) {
    return json({ error: "Realtime token rate limit reached. Please wait before reconnecting." }, 429, requestOrigin);
  }

  let falResponse: Response;
  try {
    falResponse = await fetch("https://rest.alpha.fal.ai/tokens/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify({
        allowed_apps: ["lucy-2-6"],
        token_expiration: TOKEN_EXPIRATION_SECONDS,
      }),
    });
  } catch {
    return json({ error: "Could not reach fal token service" }, 502, requestOrigin);
  }

  if (!falResponse.ok) {
    // Do not forward provider response bodies, which may contain sensitive diagnostics.
    return json({ error: "fal could not issue a realtime token" }, 502, requestOrigin);
  }

  let token = "";
  try {
    const responseText = await falResponse.text();
    // fal's realtime token provider expects the JWT as plain response text.
    // Accept either a raw text JWT or a JSON string/object response.
    try {
      const parsed: unknown = JSON.parse(responseText);
      if (typeof parsed === "string") token = parsed;
      else if (parsed && typeof parsed === "object" && "token" in parsed &&
               typeof (parsed as { token?: unknown }).token === "string") {
        token = (parsed as { token: string }).token;
      }
    } catch {
      token = responseText.trim();
    }
  } catch {
    return json({ error: "Invalid response from fal token service" }, 502, requestOrigin);
  }

  if (token.length < 20 || token.length > 8192) {
    return json({ error: "fal returned an invalid realtime token" }, 502, requestOrigin);
  }

  return new Response(token, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": requestOrigin,
      "Vary": "Origin",
    },
  });
});

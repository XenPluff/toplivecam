# Supabase deployment checklist

Project ref: `beitojhszrnnzvuaelbh`

## 1. Deploy the Edge Function

Run these commands from the repository root in PowerShell:

```powershell
npx supabase login
npx supabase link --project-ref beitojhszrnnzvuaelbh
npx supabase functions deploy fal-realtime-token --use-api
```

The function source is `supabase/functions/fal-realtime-token/index.ts`. The function validates the Supabase access token itself, including on requests made after browser CORS preflight, so `supabase/config.toml` sets `verify_jwt = false`. Do not remove the function's explicit bearer-token validation.

## 2. Set Edge Function secrets safely

Create a local file named `.env.secrets` in the repository root. This filename is ignored by Git. Its contents must be:

```dotenv
FAL_KEY=PASTE_YOUR_FAL_SECRET_KEY_HERE
APP_ORIGIN=http://localhost:3000
```

Replace the placeholder with your fal secret key locally. Do not paste that key into ChatGPT, GitHub, or a browser-visible environment variable.

Then run:

```powershell
npx supabase secrets set --env-file .env.secrets
```

Confirm the target project is `beitojhszrnnzvuaelbh` before accepting. You can securely delete the local `.env.secrets` file after the secrets have been uploaded.

Supabase injects its project URL and service-role key into Edge Function runtime variables. Do not add either to browser code.

## 3. Configure the web app

Set these browser-safe values in the hosting provider's environment settings:

- `NEXT_PUBLIC_SUPABASE_URL=https://beitojhszrnnzvuaelbh.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the project's `sb_publishable_` key.

For local development, create `.env.local` with those same two values. Never commit `.env.local`.

For local browser testing, `APP_ORIGIN` must include `http://localhost:3000`. When the production app has a domain, update `APP_ORIGIN` to that exact HTTPS origin (no trailing slash), then set the same browser-safe Supabase variables in the web host.

## 4. Verify before using paid inference

1. Deploy the web app and Edge Function.
2. Create a TopLiveCam account and confirm its email if email confirmation is enabled.
3. Sign in and verify that the camera preview works.
4. Upload a private reference image and verify it appears in the character list.
5. Start a Lucy session only when ready to incur provider usage charges.
6. Confirm that the transformed remote video actually appears. A successful token response alone is not a successful realtime session.
7. Move your head and verify that the output tracks naturally. Record actual camera FPS and returned AI FPS separately.
8. Stop the AI session and then stop the camera. Verify the browser camera indicator turns off.

## Important status

The repository contains the authenticated studio, private character uploads/library, signed reference-image URLs, the authenticated/rate-limited fal token Edge Function, and the Lucy WebRTC integration. This is implementation status, not an end-to-end verification claim. The realtime connection, output quality, billing behavior, and FPS must still be tested against the deployed Supabase project and a physical webcam.

OBS output and audio are not implemented.

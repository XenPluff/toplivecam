# Supabase deployment checklist

This file contains deployment instructions only. Do not commit provider secrets.

## 1. Deploy the Edge Function

From the repository root, install the Supabase CLI if needed, then run:

```bash
supabase login
supabase link --project-ref beitojhszrnnzvuaelbh
supabase functions deploy fal-realtime-token
```

The function source is `supabase/functions/fal-realtime-token/index.ts`. The repository config enables JWT verification for this function.

## 2. Add Edge Function secrets

In Supabase Dashboard → Project Settings → Edge Functions → Secrets (or Edge Functions → Secrets), add:

- `FAL_KEY`: your fal API key. Paste it directly into the dashboard secret value field. Never put it in GitHub, browser environment variables, or chat.
- `APP_ORIGIN`: exact browser origin(s), comma-separated. For local testing use `http://localhost:3000`. Add the production HTTPS origin when the app is deployed.

Supabase provides the project URL and service-role credentials to Edge Functions as runtime environment variables. Do not manually expose them to the browser.

## 3. Configure the web app environment

Set these browser-safe values in the hosting provider's environment settings:

- `NEXT_PUBLIC_SUPABASE_URL=https://beitojhszrnnzvuaelbh.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the `sb_publishable_` key from the Supabase API settings.

For local development, put the same two values in an untracked `.env.local` file. Never commit `.env.local`.

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

The current app now contains the authenticated studio, private character upload/library, signed reference-image URLs, the fal token Edge Function, and the Lucy WebRTC integration. This is implementation status, not an end-to-end verification claim. The realtime connection, output quality, billing behavior, and FPS must still be tested against the deployed Supabase project and a real webcam.

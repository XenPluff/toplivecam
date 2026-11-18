# TopLiveCam engineering plan

## Implemented in repository (deployment and integration tests pending)
1. Next.js / TypeScript studio foundation and responsive dark UI.
2. Supabase email sign-in and authenticated studio access.
3. Private per-user character upload, storage, listing, selection and deletion with RLS.
4. Temporary signed URLs for private reference images.
5. Supabase Edge Function for authenticated fal short-lived tokens, model scoping and per-user token issuance limits.
6. Lucy 2.6 WebRTC session integration using the current fal JS Lucy extension, with local camera tracks, remote media output, live prompt updates and orderly teardown.
7. Camera input FPS and AI output FPS are measured separately using browser video-frame callbacks.

## Remaining before production
1. Deploy the Edge Function and set FAL_KEY and APP_ORIGIN in Supabase Edge Function Secrets.
2. Configure the web app environment with the Supabase URL and publishable key.
3. Run a real physical-webcam Lucy 2.6 acceptance test, including reference-image character swap and natural movement.
4. Record actual startup time, capture FPS, output FPS, latency, dropped frames and network quality; do not infer unmeasured metrics.
5. Add session-duration and spend controls based on verified provider billing behavior.
6. Add original built-in character presets and richer character management.
7. Implement clean OBS output and test it in OBS.
8. Evaluate audio/microphone routing and browser/device compatibility.
9. Verify provider watermark, attribution, output rights and commercial terms for the active account.
10. Production deploy, monitoring, abuse controls and recovery tests.

Never fake inference, FPS, free allowances, watermark status or OBS compatibility. The app is not production-ready until the real-time acceptance test passes.

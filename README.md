# TopLiveCam

Private, browser-based live AI character-transformation studio.

## Non-negotiable scope
- Continuous live webcam input only; no prerecorded-video uploader or batch renderer.
- Target model: `decart/lucy-2-6/realtime`, subject to live verification of the current model ID and SDK contract.
- SDK: `@fal-ai/client`; realtime entry point: `fal.realtime.connect()`.
- Keep `FAL_KEY` in Supabase Edge Function Secrets only; never expose it to the browser.
- Measure camera capture FPS separately from processed AI output FPS. Never fake 30 FPS.
- No mandatory user subscription. Inference can still incur operator/provider costs.
- No unauthorized watermark removal; verify plan attribution and output restrictions.
- Do not claim OBS support until an actual returned transformed stream is tested.

## Stack
Next.js + TypeScript, Supabase Edge Functions, fal.ai realtime, Vercel deployment.

## Setup
```bash
npm install
cp .env.example .env.local
npm run dev
```
Use Node.js 20.9+ and HTTPS (localhost is also a secure context) for camera access.

## Secrets
Only browser-safe Supabase URL and anon/publishable key belong in `.env.local`.
Set `FAL_KEY` and `APP_ORIGIN` as Supabase Edge Function secrets. Never commit secrets.

## Current implementation
- Supabase email sign-in and authenticated studio access.
- Private per-user character uploads and library, backed by Storage and Row Level Security.
- Temporary signed image URLs for model reference images.
- Supabase Edge Function for authenticated, rate-limited, short-lived fal realtime tokens.
- Lucy WebRTC integration using the current `@fal-ai/client` Lucy extension (`fal.realtime.open` / `lucyRealtime`) so the camera stream and remote output are attached to WebRTC media tracks.
- Measured camera and remote output FPS using browser video-frame callbacks. Latency is not claimed until measured.

The code is implemented but not yet end-to-end verified against the deployed Supabase project and a physical webcam. The token endpoint uses fal's `https://rest.alpha.fal.ai/tokens/` service and restricts the issued token to the `lucy-2-6` app alias. Do not claim a working live transformation until the acceptance test passes. OBS output and audio are not implemented.

See `docs/SUPABASE_DEPLOYMENT.md` for deployment and `docs/REALTIME_ACCEPTANCE_TEST.md` for the release gate.

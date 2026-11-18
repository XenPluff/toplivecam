# TopLiveCam

Private, browser-based live AI character-transformation studio.

## Non-negotiable scope
- Continuous live webcam input only; no prerecorded-video uploader or batch renderer.
- Target model: `decart/lucy-2-6/realtime`, subject to live verification of the current model ID and SDK contract.
- SDK: `@fal-ai/client`; realtime entry point: `fal.realtime.connect()`.
- Keep `FAL_KEY` and `APP_PIN` in Supabase Edge Function Secrets only.
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
Set `FAL_KEY`, `APP_PIN`, and `APP_ORIGIN` as Supabase Edge Function secrets. Never commit secrets.

## Engineering status
This commit is the initial project foundation. It includes the studio shell and local camera preview. It does NOT yet implement verified Lucy signaling, transformed output, short-lived token issuance, processed FPS, audio bridge, or OBS capture. The Start AI control remains disabled until those parts are implemented and physically tested.

See `docs/REALTIME_ACCEPTANCE_TEST.md` for the release gate.

# Real-time acceptance test

**Status: NOT RUN.** The application now contains a Lucy WebRTC client and secure token path, but no live transformed output has yet been verified on a physical webcam.

| Test | Result |
|---|---|
| Supported browser + physical webcam | Not run |
| Supabase email sign-in | Implemented; deployment test pending |
| Private per-user character library | Implemented; RLS and Storage test pending |
| Reference image constraints (JPEG/PNG/WebP, min 512x512, max 10 MB) | Implemented; test pending |
| Signed private reference URL | Implemented; provider fetch test pending |
| Authenticated, model-scoped short-lived fal token | Implemented; deployment/provider test pending |
| Lucy 2.6 WebRTC signaling and ICE negotiation | Implemented via the current fal Lucy WebRTC extension; not yet tested live |
| Actual transformed remote video track displayed | Not yet verified |
| Head/body movement follows live input | Not run |
| Camera capture FPS | Browser frame callback measurement implemented; not run |
| Processed output FPS | Browser frame callback measurement implemented; not run |
| Startup and steady-state latency | Not measured |
| Frame drops and network quality | Not measured |
| Provider watermark/attribution terms | Must verify account plan and terms |
| Stop and release remote session and camera tracks | Teardown implemented; verify in browser |
| OBS capture of transformed output | Not implemented or tested |

## Release gate

Do not claim TopLiveCam is operational until a physical webcam produces an actual Lucy 2.6 transformed video stream, the selected reference image changes the subject as requested, movement remains tracked, and the output stops cleanly. Record observed camera FPS and AI output FPS separately. Do not infer latency from FPS. Do not claim OBS support until the returned transformed stream is actually tested in OBS.

## Cost and provider terms

The current fal Lucy 2.6 model page displays usage pricing of $0.02 per second. Confirm the price shown in the user's fal account before a live test. Provider billing, output rights, watermark behavior and attribution must be checked against the active account and current terms.

# TopLiveCam engineering plan

1. Project foundation and luxury responsive UI — initial scaffold committed.
2. Live camera and device selection — initial local preview committed; expand to microphone/output routing.
3. Verify fal.ai's current token-mint endpoint and exact realtime SDK signaling contract.
4. Implement real WebRTC session lifecycle, remote tracks, errors, reconnect and cleanup.
5. Upload reference image to authorized provider storage and submit documented reference URL + prompt.
6. Measure capture FPS, processed FPS, latency, frame drops and network stats separately.
7. Secure PIN/session auth, rate limiting and per-session authorization.
8. Private character library and deletion.
9. OBS clean-feed route and actual OBS verification.
10. Physical-device acceptance tests and production deployment.

Never fake inference, FPS, free allowances, watermark status or OBS compatibility.

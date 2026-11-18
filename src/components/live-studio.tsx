"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fal } from "@fal-ai/client";
import { lucyRealtime } from "@fal-ai/client/realtime/lucy";
import { supabase } from "@/lib/supabase/client";

const MODEL = "decart/lucy-2-6/realtime";
const BUCKET = "character-images";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Character = {
  id: string;
  name: string;
  description: string;
  image_path: string;
  mime_type: string;
  created_at: string;
};

type LiveHandle = {
  close: () => Promise<void>;
  send: (input: Record<string, unknown>) => void;
};

export default function LiveStudio() {
  const router = useRouter();
  const inputVideo = useRef<HTMLVideoElement>(null);
  const outputVideo = useRef<HTMLVideoElement>(null);
  const cameraStream = useRef<MediaStream | null>(null);
  const liveSession = useRef<LiveHandle | null>(null);
  const cameraFrameLoop = useRef<number | null>(null);
  const outputFrameLoop = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);

  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraFps, setCameraFps] = useState(0);
  const [outputFps, setOutputFps] = useState(0);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState("");
  const [newCharacterName, setNewCharacterName] = useState("");
  const [referencePath, setReferencePath] = useState("");
  const [referenceFileName, setReferenceFileName] = useState("");
  const [prompt, setPrompt] = useState("Transform me into the character in the reference image. Preserve my facial expressions, head movement and natural body motion. Photorealistic live video, consistent identity and lighting.");
  const [status, setStatus] = useState("Ready");
  const [notice, setNotice] = useState("Sign in to open your private live studio.");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessionLive, setSessionLive] = useState(false);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); setNotice("Supabase app settings are missing."); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace("/login"); return; }
      setEmail(data.session.user.email ?? "");
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { router.replace("/login"); return; }
      setEmail(session.user.email ?? "");
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const refreshCharacters = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("characters").select("id,name,description,image_path,mime_type,created_at").order("created_at", { ascending: false });
    if (error) { setNotice(error.message); return; }
    setCharacters((data ?? []) as Character[]);
  }, []);

  useEffect(() => {
    if (!authReady || !supabase) return;
    navigator.mediaDevices?.enumerateDevices().then(setDevices).catch(() => undefined);
    refreshCharacters();
  }, [authReady, refreshCharacters]);

  useEffect(() => {
    if (!cameraOn || !inputVideo.current) return;
    let frames = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frames += 1;
      if (now - last >= 1000) {
        setCameraFps(Math.round(frames * 1000 / (now - last)));
        frames = 0;
        last = now;
      }
      cameraFrameLoop.current = inputVideo.current?.requestVideoFrameCallback?.(tick) ?? null;
    };
    cameraFrameLoop.current = inputVideo.current.requestVideoFrameCallback?.(tick) ?? null;
    return () => {
      if (cameraFrameLoop.current !== null) inputVideo.current?.cancelVideoFrameCallback?.(cameraFrameLoop.current);
    };
  }, [cameraOn]);

  useEffect(() => {
    if (!sessionLive || !outputVideo.current) return;
    let frames = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frames += 1;
      if (now - last >= 1000) {
        setOutputFps(Math.round(frames * 1000 / (now - last)));
        frames = 0;
        last = now;
      }
      outputFrameLoop.current = outputVideo.current?.requestVideoFrameCallback?.(tick) ?? null;
    };
    outputFrameLoop.current = outputVideo.current.requestVideoFrameCallback?.(tick) ?? null;
    return () => {
      if (outputFrameLoop.current !== null) outputVideo.current?.cancelVideoFrameCallback?.(outputFrameLoop.current);
    };
  }, [sessionLive]);

  useEffect(() => {
    if (!sessionLive) return;
    const timer = window.setInterval(() => {
      if (startedAt.current) setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionLive]);

  const stopLiveSession = useCallback(async () => {
    const session = liveSession.current;
    liveSession.current = null;
    if (session) await session.close().catch(() => undefined);
    if (outputVideo.current) outputVideo.current.srcObject = null;
    setSessionLive(false);
    setStatus("Stopped");
    setOutputFps(0);
    startedAt.current = null;
  }, []);

  const stopCamera = useCallback(async () => {
    await stopLiveSession();
    cameraStream.current?.getTracks().forEach((track) => track.stop());
    cameraStream.current = null;
    if (inputVideo.current) inputVideo.current.srcObject = null;
    setCameraOn(false);
    setCameraFps(0);
    setSeconds(0);
  }, [stopLiveSession]);

  useEffect(() => () => {
    void liveSession.current?.close();
    cameraStream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function enableCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: cameraId ? { exact: cameraId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      cameraStream.current?.getTracks().forEach((track) => track.stop());
      cameraStream.current = stream;
      if (inputVideo.current) {
        inputVideo.current.srcObject = stream;
        await inputVideo.current.play();
      }
      setCameraOn(true);
      setStatus("Camera ready");
      setNotice("Camera feed is local. Start an AI session to connect to Lucy 2.6.");
      setDevices(await navigator.mediaDevices.enumerateDevices());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Camera permission failed.");
    }
  }

  async function uploadCharacter(file?: File) {
    if (!file || !supabase) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setNotice("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setNotice("Image must be 10 MB or smaller.");
      return;
    }
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      if (image.width < 512 || image.height < 512) {
        setNotice("Reference image must be at least 512 × 512 pixels.");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setBusy(true);
      try {
        const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
        const path = user.id + "/" + crypto.randomUUID() + "." + extension;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const name = newCharacterName.trim() || file.name.replace(/\.[^.]+$/, "").slice(0, 80);
        const { data, error } = await supabase.from("characters").insert({
          user_id: user.id,
          name,
          description: "",
          image_path: path,
          mime_type: file.type,
        }).select("id").single();
        if (error) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw error;
        }
        await refreshCharacters();
        setSelectedCharacter(data.id);
        setReferencePath(path);
        setReferenceFileName(file.name);
        setNewCharacterName("");
        setNotice("Character saved privately. It will be shared with Lucy using a temporary signed image URL when you start.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not save character.");
      } finally {
        setBusy(false);
      }
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); setNotice("Could not read this image."); };
    image.src = objectUrl;
  }

  async function chooseCharacter(id: string) {
    setSelectedCharacter(id);
    const character = characters.find((item) => item.id === id);
    setReferencePath(character?.image_path ?? "");
    setReferenceFileName(character?.name ?? "");
  }

  async function deleteCharacter(id: string) {
    if (!supabase || !window.confirm("Delete this saved character and its private image?")) return;
    const character = characters.find((item) => item.id === id);
    if (!character) return;
    const { error: rowError } = await supabase.from("characters").delete().eq("id", id);
    if (rowError) { setNotice(rowError.message); return; }
    const { error: fileError } = await supabase.storage.from(BUCKET).remove([character.image_path]);
    if (fileError) setNotice("Character record deleted, but image cleanup failed: " + fileError.message);
    if (selectedCharacter === id) { setSelectedCharacter(""); setReferencePath(""); setReferenceFileName(""); }
    await refreshCharacters();
  }

  async function startTransformation() {
    if (!supabase || !cameraStream.current) { setNotice("Enable your camera before starting."); return; }
    if (!prompt.trim()) { setNotice("Enter a transformation instruction."); return; }
    if (liveSession.current) await stopLiveSession();
    setBusy(true);
    setStatus("Authorizing…");
    setNotice("Requesting a short-lived, model-scoped fal token.");
    try {
      let referenceUrl: string | undefined;
      if (referencePath) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(referencePath, 900);
        if (error || !data?.signedUrl) throw error ?? new Error("Could not create temporary reference URL.");
        referenceUrl = data.signedUrl;
      }
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) throw new Error("Your sign-in session expired. Sign in again.");
      const tokenProvider = async (app: string) => {
        const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/fal-realtime-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
            "Authorization": "Bearer " + authSession.access_token,
          },
          body: JSON.stringify({ app }),
        });
        if (!response.ok) throw new Error("Realtime authorization failed (" + response.status + "): " + (await response.text()).slice(0, 240));
        return response.text();
      };
      const handle = fal.realtime.open(lucyRealtime({ endpoints: [MODEL] }), {
        input: {
          prompt: prompt.trim(),
          enable_prompt_expansion: true,
          ...(referenceUrl ? { reference_image_url: referenceUrl } : {}),
        },
        localStream: cameraStream.current,
        tokenProvider,
        tokenExpirationSeconds: 120,
        onMedia: (remoteStream) => {
          if (outputVideo.current) {
            outputVideo.current.srcObject = remoteStream;
            void outputVideo.current.play().catch(() => undefined);
          }
        },
        onState: (nextState) => {
          setStatus(nextState === "live" ? "AI LIVE" : nextState.toUpperCase());
          setSessionLive(nextState === "live");
          if (nextState === "live") {
            startedAt.current = Date.now();
            setNotice("Lucy 2.6 is connected. The transformed WebRTC stream is now arriving.");
          }
          if (nextState === "failed") setNotice("The realtime session failed. Check the error details and try again.");
          if (nextState === "closed") setNotice("Realtime session closed.");
        },
        onError: (error) => {
          setNotice(error instanceof Error ? error.message : "Realtime session error.");
          setStatus("Failed");
          setSessionLive(false);
        },
      });
      liveSession.current = handle;
      await handle.ready;
      setStatus("AI LIVE");
      setNotice("Lucy 2.6 session established. Move naturally and check the transformed output.");
    } catch (error) {
      await stopLiveSession();
      setStatus("Not connected");
      setNotice(error instanceof Error ? error.message : "Could not start the realtime session.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePrompt() {
    if (!liveSession.current) { setNotice("Start a live AI session before updating the prompt."); return; }
    liveSession.current.send({ prompt: prompt.trim(), enable_prompt_expansion: true });
    setNotice("Prompt update sent to the live session.");
  }

  async function signOut() {
    await stopCamera();
    await supabase?.auth.signOut();
    router.replace("/login");
  }

  if (!authReady) return <main className="auth-shell"><section className="auth-card"><b>TOPLIVECAM</b><p>Verifying your private session…</p></section></main>;
  if (!supabase) return <main className="auth-shell"><section className="auth-card"><b>TOPLIVECAM</b><h1>App configuration needed</h1><p>Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your deployment environment.</p></section></main>;

  return (
    <main>
      <aside>
        <div className="brand"><span className="mark">✧</span><div><b>TOPLIVE<span>CAM</span></b><small>PRIVATE LIVE STUDIO</small></div></div>
        <p className="overline">WORKSPACE</p>
        <div className="nav active">◉　Live Studio</div>
        <div className="nav">▧　Character Library <i>{characters.length}</i></div>
        <div className="security">◈　Private by design<br/><small>Signed-in user · private storage</small></div>
      </aside>
      <section className="workspace">
        <header>
          <div><small>YOUR PRIVATE CREATIVE SPACE</small><h1>Live character studio</h1></div>
          <div className="header-account"><label>▣　{email}</label><button className="secondary" onClick={signOut}>Sign out</button></div>
        </header>
        <div className="layout">
          <section className="canvas">
            <div className="heading"><div><small>LIVE CANVAS</small><h2>Original and transformed feed</h2></div><span className={sessionLive ? "online" : cameraOn ? "offline" : "offline"}>● {status.toUpperCase()}</span></div>
            <div className="video-grid">
              <div className="screen"><video ref={inputVideo} autoPlay playsInline muted/><div className="placeholder" style={{display:cameraOn ? "none" : "flex"}}><div>✧</div><b>Original camera</b><span>Enable your webcam to begin.</span></div><div className="screen-label">ORIGINAL INPUT · TARGET 720P / 30 FPS</div></div>
              <div className="screen"><video ref={outputVideo} autoPlay playsInline muted/><div className="placeholder" style={{display:sessionLive ? "none" : "flex"}}><div>✧</div><b>AI transformed output</b><span>Only a real returned WebRTC stream appears here.</span></div><div className="screen-label">LUCY 2.6 · REALTIME OUTPUT</div></div>
            </div>
            <div className="stats"><span>CAMERA INPUT<b>{cameraOn ? cameraFps + " FPS" : "—"}</b></span><span>AI OUTPUT<b>{sessionLive ? outputFps + " FPS" : "—"}</b></span><span>LATENCY<b>Not measured</b></span></div>
            <div className="actions">
              {!cameraOn ? <button onClick={enableCamera}>Enable camera</button> : <button className="secondary" onClick={stopCamera}>Stop camera</button>}
              {!sessionLive ? <button className="start" disabled={!cameraOn || busy} onClick={startTransformation}>{busy ? "Connecting…" : "Start AI transformation"}</button> : <button className="danger" onClick={stopLiveSession}>Stop AI session</button>}
              <button className="secondary" onClick={() => document.documentElement.requestFullscreen?.()}>Fullscreen</button>
            </div>
            <div className="cost"><div><small>SESSION ELAPSED</small><b>{new Date(seconds * 1000).toISOString().slice(11, 19)}</b></div><div><small>ESTIMATED AT $0.02 / SEC</small><b>${(seconds * 0.02).toFixed(2)}</b></div><div><small>NETWORK</small><b>Not measured</b></div></div>
          </section>
          <aside className="panel">
            <small>SESSION SETUP</small><h2>Studio controls</h2>
            <h3>01　Camera input</h3>
            <label>VIDEO DEVICE</label>
            <select value={cameraId} onChange={(event) => setCameraId(event.target.value)}><option value="">Default camera</option>{devices.filter((device) => device.kind === "videoinput").map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Camera"}</option>)}</select>
            <button className="link" onClick={() => navigator.mediaDevices.enumerateDevices().then(setDevices)}>↻ Refresh devices</button>
            <hr/>
            <h3>02　Character library</h3>
            <select value={selectedCharacter} onChange={(event) => void chooseCharacter(event.target.value)}><option value="">No reference image</option>{characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select>
            {selectedCharacter && <button className="link" onClick={() => void deleteCharacter(selectedCharacter)}>Delete selected character</button>}
            <input value={newCharacterName} onChange={(event) => setNewCharacterName(event.target.value)} placeholder="New character name (optional)"/>
            <label className="upload">＋　Upload and save private reference<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void uploadCharacter(event.target.files?.[0])}/><small>JPEG, PNG, WebP · min 512×512 · max 10 MB</small></label>
            {referenceFileName && <p className="filename">✓ Selected: {referenceFileName}</p>}
            <hr/>
            <h3>03　Transformation prompt</h3>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5}/>
            {sessionLive && <button className="secondary" onClick={updatePrompt}>Apply prompt to live session</button>}
            <hr/>
            <h3>04　Realtime engine</h3><div className="model">{MODEL}</div>
            <p className="warning">{notice}</p>
          </aside>
        </div>
        <footer>TOPLIVECAM © 2026 <span>REAL WEBRTC · MEASURED OUTPUT ONLY</span></footer>
      </section>
    </main>
  );
}

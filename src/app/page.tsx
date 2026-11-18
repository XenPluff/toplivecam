"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const MODEL = "decart/lucy-2-6/realtime";

export default function Home() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream|null>(null);
  const [devices,setDevices] = useState<MediaDeviceInfo[]>([]);
  const [camera,setCamera] = useState("");
  const [reference,setReference] = useState<File|null>(null);
  const [preview,setPreview] = useState(false);
  const [fps,setFps] = useState(0);
  const [pin,setPin] = useState("");
  const [notice,setNotice] = useState("Camera preview is local. AI inference is not connected yet.");
  const [seconds,setSeconds] = useState(0);
  const [authReady,setAuthReady] = useState(false);
  const [userEmail,setUserEmail] = useState("");

  useEffect(()=>{
    if (!supabase) { setAuthReady(true); setNotice("Supabase is not configured. Add the public Supabase URL and publishable key to the app environment."); return; }
    supabase.auth.getSession().then(({data})=>{
      if (!data.session) { window.location.replace("/login"); return; }
      setUserEmail(data.session.user.email ?? ""); setAuthReady(true);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if (!session) { window.location.replace("/login"); return; }
      setUserEmail(session.user.email ?? ""); setAuthReady(true);
    });
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{ if(authReady) navigator.mediaDevices?.enumerateDevices().then(setDevices).catch(()=>{}); },[authReady]);
  useEffect(()=>{ if(!preview)return; const id=setInterval(()=>setSeconds(s=>s+1),1000); return()=>clearInterval(id); },[preview]);
  useEffect(()=>()=>{stream.current?.getTracks().forEach(t=>t.stop());},[]);

  async function signOut(){ await supabase?.auth.signOut(); stopCamera(); window.location.replace("/login"); }
  async function startCamera() {
    try {
      const s=await navigator.mediaDevices.getUserMedia({video:{deviceId:camera?{exact:camera}:undefined,frameRate:{ideal:30},width:{ideal:1280},height:{ideal:720}},audio:false});
      stream.current?.getTracks().forEach(t=>t.stop()); stream.current=s;
      if(video.current){video.current.srcObject=s; await video.current.play();}
      setPreview(true); setNotice("Live camera preview active. Capture FPS and AI output FPS must be measured independently.");
      setDevices(await navigator.mediaDevices.enumerateDevices());
    } catch(e) {setNotice(e instanceof Error?e.message:"Camera permission failed.");}
  }
  function stopCamera(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;setPreview(false);setSeconds(0);setFps(0);}
  async function validatePhoto(file:File|null) {
    if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setNotice("Choose JPEG, PNG or WebP.");return;}
    const url=URL.createObjectURL(file); const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);if(img.width<512||img.height<512){setNotice("Reference must be at least 512×512 pixels.");return;}setReference(file);setNotice("Reference photo validated. Not yet uploaded to the model.");};
    img.onerror=()=>{URL.revokeObjectURL(url);setNotice("Could not read the reference image.");};img.src=url;
  }

  if (!authReady) return <main className="auth-shell"><section className="auth-card"><b>TOPLIVECAM</b><p>Verifying your private session…</p></section></main>;
  if (!supabase) return <main className="auth-shell"><section className="auth-card"><b>TOPLIVECAM</b><h1>App configuration needed</h1><p>{notice}</p><a className="auth-back" href="/login">Open sign in</a></section></main>;

  return <main>
    <aside><div className="brand"><span className="mark">✧</span><div><b>TOPLIVE<span>CAM</span></b><small>PRIVATE LIVE STUDIO</small></div></div><p className="overline">WORKSPACE</p><div className="nav active">◉　Live Studio</div><div className="nav">▧　Character Library <i>SOON</i></div><div className="security">◈　Private by design<br/><small>Provider credentials stay server-side</small></div></aside>
    <section className="workspace"><header><div><small>YOUR PRIVATE CREATIVE SPACE</small><h1>Live character studio</h1></div><label>▣　PRIVATE SESSION · {userEmail}</label><button className="secondary" onClick={signOut}>Sign out</button></header>
      <div className="layout"><section className="canvas"><div className="heading"><div><small>LIVE CANVAS</small><h2>Your camera, transformed</h2></div><span className={preview?"online":"offline"}>● {preview?"CAMERA PREVIEW":"READY"}</span></div>
        <div className="screen"><video ref={video} autoPlay playsInline muted/><div className="placeholder" style={{display:preview?"none":"flex"}}><div>✧</div><b>Your live studio awaits</b><span>Enable your camera to see your original feed.</span></div><div className="screen-label">LIVE INPUT · TARGET 720P / 30 FPS</div><div className="stats"><span>CAMERA INPUT<b>{fps||"—"} FPS</b></span><span>AI OUTPUT<b>— FPS</b></span><span>LATENCY<b>— MS</b></span></div></div>
        <div className="actions">{!preview?<button onClick={startCamera}>Enable camera preview</button>:<button className="danger" onClick={stopCamera}>Stop camera</button>}<button className="secondary" onClick={()=>document.documentElement.requestFullscreen?.()}>Fullscreen</button></div>
        <div className="cost"><div><small>SESSION ELAPSED</small><b>{new Date(seconds*1000).toISOString().slice(11,19)}</b></div><div><small>ESTIMATED MODEL COST AT $0.02/SEC</small><b>${(seconds*.02).toFixed(2)}</b></div><div><small>NETWORK</small><b>Not measured</b></div></div>
      </section>
      <aside className="panel"><small>SESSION SETUP</small><h2>Studio controls</h2><label>ACCESS PIN</label><input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="Enter private PIN"/>
        <hr/><h3>01　Camera input</h3><label>VIDEO DEVICE</label><select value={camera} onChange={e=>setCamera(e.target.value)}><option value="">Choose camera</option>{devices.filter(d=>d.kind==="videoinput").map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||"Camera"}</option>)}</select>
        <button className="link" onClick={()=>navigator.mediaDevices.enumerateDevices().then(setDevices)}>↻ Refresh devices</button>
        <hr/><h3>02　Character reference</h3><label className="upload">＋　Choose reference photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>validatePhoto(e.target.files?.[0]??null)}/><small>JPEG, PNG, WebP · minimum 512×512</small></label>{reference&&<p className="filename">✓ {reference.name}</p>}
        <label>TRANSFORMATION PROMPT</label><textarea defaultValue="Transform the person using the supplied reference image. Photorealistic real-world webcam footage, natural skin texture and lighting; preserve the original background and clothing."/>
        <hr/><h3>03　Live session</h3><div className="model">{MODEL}</div><button className="start" disabled>Start AI transformation — integration pending</button><p className="warning">{notice}</p>
      </aside></div>
      <footer>TOPLIVECAM © 2026 <span>REAL-TIME ENGINE · IMPLEMENTATION IN PROGRESS</span></footer>
    </section>
  </main>;
}

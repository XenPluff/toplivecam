"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!supabase) {
      setMessage("Supabase is not configured. Add the public project URL and publishable key to the app environment.");
      return;
    }
    if (password.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMessage(data.session
          ? "Account created. Opening your private studio…"
          : "Account created. Check your email to confirm your address, then sign in.");
        if (data.session) router.replace("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.replace("/");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand"><span className="mark">✧</span><div><b>TOPLIVE<span>CAM</span></b><small>PRIVATE LIVE STUDIO</small></div></div>
        <p className="overline">PRIVATE WORKSPACE ACCESS</p>
        <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-subtitle">Sign in to access your private live character studio and saved references.</p>
        <form onSubmit={submit}>
          <label htmlFor="email">EMAIL ADDRESS</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <label htmlFor="password">PASSWORD</label>
          <input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          <button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in securely" : "Create account"}</button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        <button className="auth-switch" type="button" onClick={() => {setMode(mode === "signin" ? "signup" : "signin");setMessage("");}}>
          {mode === "signin" ? "New to TopLiveCam? Create an account" : "Already have an account? Sign in"}
        </button>
        <Link className="auth-back" href="/">Return to studio</Link>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type AppState = "idle" | "listening" | "thinking" | "speaking";

const BRIEFING_MSG =
  "Daddy's home. Give me a full briefing: what's on my schedule today and tomorrow, current weather in Floyd's Knobs Indiana, Elite Exteriors job and revenue status today, anything urgent I need to know, and the single most important thing I should focus on right now.";

export default function WakePage() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [statusText, setStatusText] = useState("Click to activate");
  const [subText, setSubText] = useState("Requires microphone access");
  const [clapLit, setClapLit] = useState([false, false]);
  const [volWidth, setVolWidth] = useState(0);
  const [started, setStarted] = useState(false);
  const [transcript, setTranscript] = useState("");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number>(0);
  const clapTimesRef = useRef<number[]>([]);
  const inClapRef = useRef(false);
  const lastClapAtRef = useRef(0);
  const triggeredRef = useRef(false);
  const speakingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Audio / Clap detection ──────────────────────────────────────────────
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    if (!analyserRef.current || !dataArrayRef.current) return;
    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

    let peak = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      const v = Math.abs(dataArrayRef.current[i] - 128);
      if (v > peak) peak = v;
    }
    setVolWidth(Math.min(100, (peak / 75) * 100));

    if (triggeredRef.current || speakingRef.current) return;

    const level = peak + 128;
    const now = Date.now();
    const THRESHOLD = 182;
    const WINDOW_MS = 850;
    const COOLDOWN_MS = 180;

    if (level > THRESHOLD && !inClapRef.current && now - lastClapAtRef.current > COOLDOWN_MS) {
      inClapRef.current = true;
      lastClapAtRef.current = now;
      clapTimesRef.current.push(now);
      clapTimesRef.current = clapTimesRef.current.filter((t) => now - t < WINDOW_MS);

      const idx = Math.min(clapTimesRef.current.length - 1, 1);
      flashDot(idx);

      if (clapTimesRef.current.length >= 2) {
        flashDot(0);
        flashDot(1);
        clapTimesRef.current = [];
        triggerJarvis("double clap");
      }
    } else if (level < 140) {
      inClapRef.current = false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function flashDot(i: number) {
    setClapLit((prev) => {
      const next = [...prev];
      next[i] = true;
      return next;
    });
    setTimeout(() => {
      setClapLit((prev) => {
        const next = [...prev];
        next[i] = false;
        return next;
      });
    }, 280);
  }

  // ── Speech recognition ──────────────────────────────────────────────────
  const initSpeech = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e: any) => {
      if (triggeredRef.current || speakingRef.current) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t: string = e.results[i][0].transcript.toLowerCase().trim();
        if (
          t.includes("daddy's home") ||
          t.includes("daddys home") ||
          t.includes("daddy is home") ||
          t.includes("wake up jarvis") ||
          t.includes("hey jarvis") ||
          t.includes("jarvis wake up")
        ) {
          triggerJarvis("voice command");
          return;
        }
      }
    };

    rec.onerror = () => {};
    rec.onend = () => {
      if (!triggeredRef.current && !speakingRef.current) {
        setTimeout(() => { try { rec.start(); } catch {} }, 400);
      }
    };

    try { rec.start(); } catch {}
    recognitionRef.current = rec;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Boot ────────────────────────────────────────────────────────────────
  const boot = useCallback(async () => {
    if (started) return;
    setStarted(true);

    // Unlock speech synthesis (must be inside user gesture)
    const dummy = new SpeechSynthesisUtterance("");
    dummy.volume = 0;
    window.speechSynthesis.speak(dummy);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.15;
      const data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataArrayRef.current = data;
      tick();
    } catch {
      setSubText("No mic — tap the orb or press Space");
    }

    initSpeech();
    setAppState("listening");
    setStatusText("Listening");
    setSubText('Double clap or say "daddy\'s home"');
  }, [started, tick, initSpeech]);

  // ── Keyboard shortcut ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        if (!triggeredRef.current && !speakingRef.current && started) manualTrigger();
      }
      if (e.code === "Escape") stopSpeaking();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trigger ─────────────────────────────────────────────────────────────
  const triggerJarvis = useCallback(async (method: string) => {
    if (triggeredRef.current || speakingRef.current) return;
    triggeredRef.current = true;
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    cancelAnimationFrame(rafRef.current);

    setAppState("thinking");
    setStatusText("Jarvis is thinking...");
    setSubText(`Triggered by ${method}`);
    setTranscript("");

    try {
      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: BRIEFING_MSG }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const text: string = data.response || data.error || "No response received.";
      speak(text);
    } catch (err: any) {
      triggeredRef.current = false;
      setAppState("listening");
      setStatusText("Error");
      setSubText(String(err?.message ?? err));
      if (audioCtxRef.current) tick();
      if (recognitionRef.current) try { recognitionRef.current.start(); } catch {}
    }
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  function manualTrigger() {
    triggerJarvis("manual tap");
  }

  // ── Text-to-Speech ──────────────────────────────────────────────────────
  async function speak(text: string) {
    speakingRef.current = true;
    triggeredRef.current = false;
    setAppState("speaking");
    setStatusText("Speaking...");
    setTranscript(text.length > 320 ? text.slice(0, 320) + "…" : text);

    const done = () => {
      speakingRef.current = false;
      utteranceRef.current = null;
      setAppState("listening");
      setStatusText("Listening");
      setSubText('Ready — double clap or say "daddy\'s home"');
      setTranscript("");
      if (audioCtxRef.current) tick();
      if (recognitionRef.current) try { recognitionRef.current.start(); } catch {}
    };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`TTS ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.pause();
    audio.src = url;
    audio.preload = "auto";
    audio.onended = () => { URL.revokeObjectURL(url); done(); };
    audio.onerror = () => { URL.revokeObjectURL(url); done(); };
    await audio.play();
  }

  function stopSpeaking() {
    if (!speakingRef.current) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    window.speechSynthesis.cancel();
    speakingRef.current = false;
    utteranceRef.current = null;
    triggeredRef.current = false;
    setAppState("listening");
    setStatusText("Listening");
    setSubText("Stopped — ready");
    setTranscript("");
    if (audioCtxRef.current) tick();
    if (recognitionRef.current) try { recognitionRef.current.start(); } catch {}
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) { audioRef.current.pause(); }
      window.speechSynthesis.cancel();
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    };
  }, []);

  // ── Ring colors per state ───────────────────────────────────────────────
  const ringColors: Record<AppState, { r1: string; r2: string; r3: string; glow: string }> = {
    idle:      { r1: "#0d1a2a", r2: "#0f1e30", r3: "#112236", glow: "transparent" },
    listening: { r1: "#1a3a6e", r2: "#1e4a8a", r3: "#2258a8", glow: "transparent" },
    thinking:  { r1: "#cc9922", r2: "#aa7711", r3: "#886600", glow: "#ffcc4433" },
    speaking:  { r1: "#00cc77", r2: "#00aa66", r3: "#009955", glow: "#00ff8833" },
  };

  const orbEmoji: Record<AppState, string> = {
    idle: "🤖", listening: "🤖", thinking: "⚡", speaking: "🔊",
  };

  const statusColor: Record<AppState, string> = {
    idle: "text-slate-600",
    listening: "text-blue-400",
    thinking: "text-yellow-400",
    speaking: "text-green-400",
  };

  const rc = ringColors[appState];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] select-none">
      {/* Pre-start overlay */}
      {!started && (
        <div
          className="flex flex-col items-center gap-5 cursor-pointer"
          onClick={boot}
        >
          <div className="text-7xl">🤖</div>
          <div className="bg-slate-800 border border-slate-600 rounded-2xl px-10 py-5 text-blue-300 font-semibold text-lg tracking-wide hover:bg-slate-700 transition-colors">
            Activate Jarvis
          </div>
          <p className="text-xs text-slate-600">Click to enable microphone &amp; speech</p>
        </div>
      )}

      {/* Main UI */}
      {started && (
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16 w-full max-w-2xl px-6">
          {/* Orb */}
          <div
            className="relative flex-shrink-0 cursor-pointer"
            style={{ width: "clamp(180px,38vmin,260px)", height: "clamp(180px,38vmin,260px)" }}
            onClick={() => { if (!triggeredRef.current && !speakingRef.current) manualTrigger(); }}
            title="Click to trigger"
          >
            {/* Rings */}
            {[
              { inset: "0px", color: rc.r1, delay: "0s" },
              { inset: "11px", color: rc.r2, delay: "0.2s" },
              { inset: "22px", color: rc.r3, delay: "0.4s" },
            ].map((ring, i) => (
              <div
                key={i}
                className="absolute rounded-full transition-all duration-300"
                style={{
                  inset: ring.inset,
                  border: `1.5px solid ${ring.color}`,
                  boxShadow: i === 0 ? `0 0 30px ${rc.glow}` : "none",
                  animation:
                    appState === "listening" ? `pulse-ring 2.5s ease-in-out ${ring.delay} infinite` :
                    appState === "thinking"  ? `spin ${i === 1 ? "1.5s linear reverse infinite" : "1.5s linear infinite"}` :
                    appState === "speaking"  ? `glow-pulse 0.9s ease-in-out ${ring.delay} infinite` :
                    "none",
                }}
              />
            ))}

            {/* Inner orb */}
            <div
              className="absolute flex items-center justify-center rounded-full transition-all duration-300"
              style={{
                inset: "33px",
                background:
                  appState === "thinking" ? "radial-gradient(circle at 35% 35%, #2a2000, #0a0800)" :
                  appState === "speaking" ? "radial-gradient(circle at 35% 35%, #002214, #00070a)" :
                  "radial-gradient(circle at 35% 35%, #1a3060, #06091a)",
                boxShadow: "inset 0 0 30px #00000088",
                fontSize: "clamp(32px,8vmin,56px)",
              }}
            >
              {orbEmoji[appState]}
            </div>

            {/* Volume bar */}
            <div
              className="absolute rounded-full overflow-hidden"
              style={{ bottom: "-6px", left: "50%", transform: "translateX(-50%)", width: "100px", height: "3px", background: "#0d1520" }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-[50ms]"
                style={{
                  width: `${volWidth}%`,
                  background: appState === "speaking"
                    ? "linear-gradient(90deg, #00a855, #00ff88)"
                    : "linear-gradient(90deg, #1a5fa0, #00aaff)",
                }}
              />
            </div>
          </div>

          {/* Status side */}
          <div className="flex flex-col gap-3 text-center md:text-left max-w-sm w-full">
            <p className={`text-lg font-semibold tracking-wide transition-colors ${statusColor[appState]}`}>
              {statusText}
            </p>
            {transcript ? (
              <p className="text-sm text-slate-500 leading-relaxed">{transcript}</p>
            ) : (
              <p className="text-sm text-slate-600">{subText}</p>
            )}

            {/* Clap dots */}
            <div className="flex gap-3 justify-center md:justify-start mt-1">
              {clapLit.map((lit, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full transition-all duration-100"
                  style={{
                    background: lit ? "#00aaff" : "#0d1a2a",
                    boxShadow: lit ? "0 0 8px #00aaff" : "none",
                  }}
                />
              ))}
            </div>

            {appState === "speaking" && (
              <button
                onClick={stopSpeaking}
                className="mt-2 self-center md:self-start bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
              >
                Stop speaking
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hints */}
      {started && (
        <p className="mt-12 text-xs text-slate-700 text-center leading-7">
          Double clap &nbsp;·&nbsp; Say &quot;daddy&apos;s home&quot; or &quot;wake up jarvis&quot; &nbsp;·&nbsp;{" "}
          <kbd className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-600">Space</kbd>
          &nbsp;to trigger &nbsp;·&nbsp;{" "}
          <kbd className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-600">Esc</kbd>
          &nbsp;to stop
        </p>
      )}

      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.012); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px #00ff8833; }
          50% { box-shadow: 0 0 50px #00ff88aa; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

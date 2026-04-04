"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Globe, Activity, BarChart3, Cog, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/backend-client";
import { supabase } from "@/lib/supabase-safe-client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  working: boolean;
  color: string; // tailwind gradient classes
  glowRgb: string; // for SVG glow
  icon: React.ReactNode;
}

// ─── Sub-agents ───────────────────────────────────────────────────────────────
const AGENTS: Agent[] = [
  { id: "atlas",   name: "Atlas",  role: "Website",   working: false, color: "from-cyan-500 to-blue-600",    glowRgb: "34,211,238",  icon: <Globe    size={15}/> },
  { id: "oracle",  name: "Oracle", role: "Research",  working: false, color: "from-violet-500 to-purple-700",glowRgb: "167,139,250", icon: <Activity size={15}/> },
  { id: "cipher",  name: "Cipher", role: "Marketing", working: false, color: "from-pink-500 to-rose-700",    glowRgb: "244,114,182", icon: <BarChart3 size={15}/> },
  { id: "vector",  name: "Vector", role: "Ops",       working: false, color: "from-amber-500 to-orange-600", glowRgb: "251,191,36",  icon: <Cog      size={15}/> },
];

// ─── Energy line SVG ──────────────────────────────────────────────────────────
function EnergyLines({ agents, orbBottom }: { agents: Agent[]; orbBottom: { x: number; y: number } }) {
  // agent card centers (% based, recalculated from layout)
  const agentXs = [12.5, 37.5, 62.5, 87.5]; // % of container width — 4 equal slots

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      style={{ zIndex: 5 }}
    >
      <defs>
        {agents.map((a, i) => (
          <linearGradient key={a.id} id={`grad-${a.id}`} x1="50%" y1="0%" x2={`${agentXs[i]}%`} y2="100%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor={`rgb(59,130,246)`}     stopOpacity={a.working ? 0.9 : 0.15} />
            <stop offset="100%" stopColor={`rgb(${a.glowRgb})`}  stopOpacity={a.working ? 0.8 : 0.1} />
          </linearGradient>
        ))}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {agents.map((agent, i) => {
        const x2 = `${agentXs[i]}%`;
        return (
          <g key={agent.id} filter={agent.working ? "url(#glow)" : undefined}>
            {/* Base dim line always visible */}
            <line
              x1="50%" y1="0"
              x2={x2} y2="100%"
              stroke={`rgba(${agent.glowRgb}, ${agent.working ? 0.7 : 0.1})`}
              strokeWidth={agent.working ? 1.5 : 0.8}
              strokeDasharray={agent.working ? "6 4" : "3 6"}
              style={agent.working ? { animation: `flowLine 0.8s linear infinite` } : undefined}
            />
            {/* Bright flow particle */}
            {agent.working && (
              <line
                x1="50%" y1="0"
                x2={x2} y2="100%"
                stroke={`rgba(${agent.glowRgb}, 0.95)`}
                strokeWidth={2.5}
                strokeDasharray="3 40"
                style={{ animation: `flowLine ${0.6 + i * 0.15}s linear infinite` }}
              />
            )}
          </g>
        );
      })}

      <style>{`
        @keyframes flowLine {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -60; }
        }
      `}</style>
    </svg>
  );
}

// ─── Space Orb ────────────────────────────────────────────────────────────────
function SpaceOrb({ onTranscript, isSpeaking, isListening, onListeningChange }: {
  onTranscript: (t: string) => void;
  isSpeaking: boolean;
  isListening: boolean;
  onListeningChange: (v: boolean) => void;
}) {
  const [volume, setVolume]      = useState(0);
  const [jarvisVol, setJarvisVol]= useState(0);
  const recognitionRef = useRef<any>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const animFrameRef   = useRef<number>(0);
  const streamRef      = useRef<MediaStream | null>(null);
  const emittedRef     = useRef(false);

  useEffect(() => {
    if (!isSpeaking) { setJarvisVol(0); return; }
    const id = setInterval(() => setJarvisVol(0.3 + Math.random() * 0.7), 55);
    return () => clearInterval(id);
  }, [isSpeaking]);

  const activeVol = isListening ? volume : isSpeaking ? jarvisVol : 0;
  const isActive  = isListening || isSpeaking;
  const rgb       = isListening ? "59,130,246" : isSpeaking ? "139,92,246" : "30,64,175";

  const stopAnalyser = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null; analyserRef.current = null; setVolume(0);
  }, []);

  const startListening = useCallback(async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    emittedRef.current = false;
    const rec = new SR(); rec.lang = "en-US"; rec.interimResults = false;
    recognitionRef.current = rec;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext(); const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
      src.connect(analyser); analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => { analyser.getByteFrequencyData(data); setVolume(Math.min(data.reduce((a,b)=>a+b,0)/data.length/80,1)); animFrameRef.current = requestAnimationFrame(tick); };
      tick();
    } catch {}
    rec.onresult = (e: any) => { const t = e.results[0]?.[0]?.transcript?.trim(); if (t && !emittedRef.current) { emittedRef.current = true; onTranscript(t); } };
    rec.onend = () => { stopAnalyser(); onListeningChange(false); };
    rec.start(); onListeningChange(true);
  }, [onTranscript, stopAnalyser, onListeningChange]);

  const stopListening = useCallback(() => { recognitionRef.current?.stop(); stopAnalyser(); onListeningChange(false); }, [stopAnalyser, onListeningChange]);

  const handleClick = () => {
    if (isSpeaking) { window.speechSynthesis?.cancel(); return; }
    isListening ? stopListening() : startListening();
  };

  const scale   = 1 + activeVol * 0.14;
  const glow    = isActive ? 0.5 + activeVol * 0.5 : 0.2;

  return (
    <button onClick={handleClick} className="relative flex items-center justify-center focus:outline-none select-none" style={{ width: 200, height: 200 }}>
      {/* Outer ambient haze */}
      <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, rgba(${rgb},${glow*0.35}) 0%, transparent 65%)`, transform: `scale(${1.7 + activeVol*0.3})`, filter:"blur(24px)", transition:"all 0.09s ease-out" }} />
      {/* Ring 1 */}
      <div className="absolute rounded-full" style={{ width: 165+activeVol*50, height: 165+activeVol*50, background: `radial-gradient(circle, rgba(${rgb},${glow*0.5}) 0%, transparent 70%)`, filter:"blur(8px)", transition:"all 0.07s ease-out" }} />
      {/* Ring 2 - orbit */}
      <div className="absolute rounded-full animate-pulse" style={{ width: 120+activeVol*30, height: 120+activeVol*30, border: `1px solid rgba(${rgb},${isActive?0.55:0.18})`, transition:"all 0.09s ease-out" }} />
      {/* Ring 3 */}
      <div className="absolute rounded-full" style={{ width: 94+activeVol*18, height: 94+activeVol*18, border: `1px solid rgba(${rgb},${isActive?0.75:0.28})`, transition:"all 0.07s ease-out" }} />

      {/* Sphere */}
      <div className="relative z-10 rounded-full flex items-center justify-center" style={{
        width: 80, height: 80,
        background: isListening
          ? "radial-gradient(circle at 33% 33%, #93c5fd, #1d4ed8 55%, #0f172a)"
          : isSpeaking
          ? "radial-gradient(circle at 33% 33%, #d8b4fe, #7c3aed 55%, #1e0040)"
          : "radial-gradient(circle at 33% 33%, #60a5fa, #1e40af 55%, #0f172a)",
        boxShadow: isActive ? `0 0 ${28+activeVol*42}px rgba(${rgb},0.85), 0 0 ${55+activeVol*28}px rgba(${rgb},0.4), inset 0 2px 6px rgba(255,255,255,0.22)` : `0 0 14px rgba(30,64,175,0.5), inset 0 2px 4px rgba(255,255,255,0.1)`,
        transform: `scale(${scale})`,
        border: "1px solid rgba(255,255,255,0.18)",
        transition: "transform 0.07s ease-out, box-shadow 0.07s ease-out",
      }}>
        <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 70%)" }} />
        {isSpeaking ? (
          <div className="flex gap-0.5 items-end h-5">
            {[0,1,2,3,4].map((i)=>(
              <div key={i} className="w-1 bg-white/90 rounded-full animate-bounce" style={{ height:`${35+Math.sin(i*0.9)*45}%`, animationDelay:`${i*0.07}s`, animationDuration:"0.5s" }}/>
            ))}
          </div>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={isListening?"text-white":"text-blue-200"}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
          </svg>
        )}
      </div>

      {/* Ping rings when active */}
      {isActive && <>
        <div className="absolute rounded-full animate-ping opacity-15" style={{ width:100, height:100, border:`1px solid rgba(${rgb},1)`, animationDuration:"1.6s" }}/>
        <div className="absolute rounded-full animate-ping opacity-8"  style={{ width:130, height:130, border:`1px solid rgba(${rgb},1)`, animationDuration:"2.2s", animationDelay:"0.4s" }}/>
      </>}
    </button>
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────────
function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className={`relative rounded-xl border overflow-hidden flex flex-col items-center gap-1.5 py-3 px-2 transition-all duration-300 ${
      agent.working ? "border-white/20 bg-white/5" : "border-white/5 bg-white/[0.03] hover:border-white/10"
    }`}>
      {/* Top gradient bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${agent.color} transition-opacity duration-300`} style={{ opacity: agent.working ? 1 : 0.35 }} />

      {/* Working pulse */}
      {agent.working && <div className={`absolute inset-0 bg-gradient-to-b ${agent.color} opacity-[0.07] animate-pulse rounded-xl`} />}

      {/* Icon */}
      <div className={`relative z-10 w-8 h-8 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center text-white shadow-lg`}
        style={{ boxShadow: agent.working ? `0 0 12px rgba(${agent.glowRgb},0.6)` : "none" }}>
        {agent.icon}
      </div>

      {/* Status dot */}
      <div className="relative z-10 flex items-center gap-1">
        <div className={`w-1.5 h-1.5 rounded-full ${agent.working ? "animate-pulse" : ""}`}
          style={{ backgroundColor: agent.working ? `rgb(${agent.glowRgb})` : "rgb(71,85,105)" }} />
        <p className="text-white text-[11px] font-semibold">{agent.name}</p>
      </div>
      <p className="relative z-10 text-[10px] text-slate-500">{agent.role}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [messages, setMessages]      = useState<Message[]>([]);
  const [input, setInput]            = useState("");
  const [loading, setLoading]        = useState(false);
  const [isSpeaking, setIsSpeaking]  = useState(false);
  const [isListening, setIsListening]= useState(false);
  const [agents, setAgents]          = useState<Agent[]>(AGENTS);
  const [chatOpen, setChatOpen]      = useState(false);
  const [lastReply, setLastReply]    = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Load recent messages
  useEffect(() => {
    api.fetchMessages().then((rows: any[]) => {
      if (!rows.length) return;
      setMessages(rows.slice(-30).map((r) => ({
        id: r.id, role: r.sender === "matthew" ? "user" : "assistant", content: r.text,
      })));
    }).catch(() => {});
  }, []);

  // Live: watch active tasks → light up Atlas (website agent)
  useEffect(() => {
    const ch = supabase.channel("dash-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, (p) => {
        const t = p.new as any;
        const active = t.status === "in-progress" && t.assignee_id === "jarvis";
        setAgents((prev) => prev.map((a) => a.id === "atlas" ? { ...a, working: active } : a));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95; utt.pitch = 0.88;
    const vs = window.speechSynthesis.getVoices();
    const preferred = [
      (v: SpeechSynthesisVoice) => v.name.includes("Daniel") && v.lang.startsWith("en"),
      (v: SpeechSynthesisVoice) => v.name.includes("Arthur"),
      (v: SpeechSynthesisVoice) => v.name.includes("Google UK English Male"),
      (v: SpeechSynthesisVoice) => v.lang === "en-GB",
      (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
    ];
    for (const fn of preferred) { const m = vs.find(fn); if (m) { utt.voice = m; break; } }
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    const history = [...messages, userMsg].slice(-20).map((m) => ({ role: m.role, content: m.content }));
    const replyId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: replyId, role: "assistant", content: "", streaming: true }]);

    try {
      const res = await fetch("/api/openclaw", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("err");
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let full = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim(); if (d === "[DONE]") break;
          try { const delta = JSON.parse(d).choices?.[0]?.delta?.content; if (delta) { full += delta; setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, content: full } : m)); } } catch {}
        }
      }
      setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, streaming: false } : m));
      if (full) { setLastReply(full); speak(full); api.createMessage({ sender: "matthew", text }).catch(()=>{}); api.createMessage({ sender: "jarvis", text: full }).catch(()=>{}); }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, content: "Connection issue, sir.", streaming: false } : m));
    } finally { setLoading(false); setTimeout(() => inputRef.current?.focus(), 80); }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#060912] relative">

      {/* Starfield */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{ width: Math.random()*1.8+0.3, height: Math.random()*1.8+0.3, top:`${Math.random()*100}%`, left:`${Math.random()*100}%`, opacity: Math.random()*0.4+0.05, animationDelay:`${Math.random()*5}s`, animation:`pulse ${3+Math.random()*4}s ease-in-out infinite` }}/>
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-3 flex-shrink-0">
        <div>
          <p className="text-[10px] text-blue-500 tracking-[0.3em] uppercase font-medium">Jarvis Intelligence</p>
          <h1 className="text-xl font-bold text-white tracking-wider">Command Center</h1>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"/>
          <span>All systems nominal</span>
        </div>
      </div>

      {/* Orb + agents section — fixed center stage */}
      <div className="relative z-10 flex flex-col items-center flex-shrink-0" style={{ paddingTop: 8 }}>

        {/* Orb */}
        <SpaceOrb
          onTranscript={sendMessage}
          isSpeaking={isSpeaking}
          isListening={isListening}
          onListeningChange={setIsListening}
        />

        {/* Label */}
        <div className="flex flex-col items-center mt-1 mb-1">
          <p className="text-[10px] tracking-[0.25em] uppercase font-medium"
            style={{ color: isListening ? "#60a5fa" : isSpeaking ? "#c084fc" : "#334155" }}>
            {isListening ? "Listening..." : isSpeaking ? "Speaking — tap to stop" : "tap to speak"}
          </p>
        </div>

        {/* Energy lines + agents — relative container */}
        <div className="relative w-full max-w-sm" style={{ height: 90 }}>
          <EnergyLines agents={agents} orbBottom={{ x: 50, y: 0 }} />
          {/* Agents row */}
          <div className="absolute bottom-0 left-0 right-0 grid grid-cols-4 gap-2 px-4">
            {agents.map((a) => <AgentCard key={a.id} agent={a} />)}
          </div>
        </div>

      </div>

      {/* Divider */}
      <div className="relative z-10 flex items-center gap-3 px-6 mt-2 flex-shrink-0">
        <div className="flex-1 h-px bg-slate-800/80" />
        <button onClick={() => setChatOpen((v) => !v)} className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest">
          {chatOpen ? <ChevronDown size={11}/> : <ChevronUp size={11}/>} {chatOpen ? "Hide" : "Show"} chat
        </button>
        <div className="flex-1 h-px bg-slate-800/80" />
      </div>

      {/* Chat — subtle, collapsible */}
      {chatOpen && (
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-2 space-y-2 min-h-0">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600/30 text-blue-100 border border-blue-700/30"
                  : "bg-white/[0.04] text-slate-300 border border-white/[0.05]"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.streaming && <span className="inline-block w-1 h-3 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm"/>}
              </div>
            </div>
          ))}
          {loading && messages[messages.length-1]?.content === "" && (
            <div className="flex justify-start">
              <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.05] flex gap-1">
                {[0,150,300].map((d)=><div key={d} className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
              </div>
            </div>
          )}
          <div ref={scrollRef}/>
        </div>
      )}

      {/* If chat closed, show last reply as ghost text */}
      {!chatOpen && lastReply && (
        <div className="relative z-10 flex-1 flex items-start justify-center px-8 pt-3 overflow-hidden">
          <p className="text-slate-700 text-xs text-center leading-relaxed italic line-clamp-3 max-w-md">
            "{lastReply}"
          </p>
        </div>
      )}

      {/* Input bar — always visible at bottom */}
      <div className="relative z-10 px-6 pb-5 pt-2 flex-shrink-0">
        <div className="flex gap-2 bg-white/[0.04] backdrop-blur-sm border border-white/[0.07] rounded-2xl px-4 py-2.5 max-w-lg mx-auto">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-white placeholder:text-slate-700 text-xs focus:outline-none"
            disabled={loading}
            autoFocus
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            className="text-slate-600 hover:text-blue-400 transition-colors disabled:opacity-30">
            <Send size={14}/>
          </button>
        </div>
      </div>

    </div>
  );
}

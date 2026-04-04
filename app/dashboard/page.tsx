"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Globe, Activity, BarChart3, Cog, Loader2, CheckCircle2, ChevronDown, ChevronUp, Bot } from "lucide-react";
import { api } from "@/lib/backend-client";
import { supabase } from "@/lib/supabase-safe-client";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message { id: string; role: "user" | "assistant"; content: string; streaming?: boolean; }
interface ActiveTask { id: string; title: string; status: string; assignee_id: string | null; description?: string; }
interface Agent { id: string; name: string; role: string; working: boolean; glowRgb: string; gradient: string; icon: React.ReactNode; }

const AGENTS: Agent[] = [
  { id: "atlas",  name: "Atlas",  role: "Website",   working: false, glowRgb: "34,211,238",  gradient: "from-cyan-500 to-blue-600",    icon: <Globe     size={18}/> },
  { id: "oracle", name: "Oracle", role: "Research",  working: false, glowRgb: "167,139,250", gradient: "from-violet-500 to-purple-700", icon: <Activity  size={18}/> },
  { id: "cipher", name: "Cipher", role: "Marketing", working: false, glowRgb: "244,114,182", gradient: "from-pink-500 to-rose-700",     icon: <BarChart3 size={18}/> },
  { id: "vector", name: "Vector", role: "Ops",       working: false, glowRgb: "251,191,36",  gradient: "from-amber-500 to-orange-600",  icon: <Cog       size={18}/> },
];

// ── Space Orb ─────────────────────────────────────────────────────────────────
function SpaceOrb({ onTranscript, isSpeaking, isListening, onListeningChange }: {
  onTranscript: (t: string) => void;
  isSpeaking: boolean; isListening: boolean;
  onListeningChange: (v: boolean) => void;
}) {
  const [volume, setVolume]       = useState(0);
  const [jVol, setJVol]           = useState(0);
  const recRef   = useRef<any>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const frame    = useRef<number>(0);
  const stream   = useRef<MediaStream | null>(null);
  const emitted  = useRef(false);

  useEffect(() => {
    if (!isSpeaking) { setJVol(0); return; }
    const id = setInterval(() => setJVol(0.3 + Math.random() * 0.7), 55);
    return () => clearInterval(id);
  }, [isSpeaking]);

  const vol    = isListening ? volume : isSpeaking ? jVol : 0;
  const active = isListening || isSpeaking;
  const rgb    = isListening ? "59,130,246" : isSpeaking ? "139,92,246" : "30,64,175";

  const stopAudio = useCallback(() => {
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach(t => t.stop());
    stream.current = null; analyser.current = null; setVolume(0);
  }, []);

  const startListening = useCallback(async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    emitted.current = false;
    const rec = new SR(); rec.lang = "en-US"; rec.interimResults = false;
    recRef.current = rec;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const ctx = new AudioContext(); const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser(); an.fftSize = 256; src.connect(an); analyser.current = an;
      const data = new Uint8Array(an.frequencyBinCount);
      const tick = () => { an.getByteFrequencyData(data); setVolume(Math.min(data.reduce((a,b)=>a+b,0)/data.length/80,1)); frame.current = requestAnimationFrame(tick); };
      tick();
    } catch {}
    rec.onresult = (e: any) => { const t = e.results[0]?.[0]?.transcript?.trim(); if (t && !emitted.current) { emitted.current = true; onTranscript(t); } };
    rec.onend = () => { stopAudio(); onListeningChange(false); };
    rec.start(); onListeningChange(true);
  }, [onTranscript, stopAudio, onListeningChange]);

  const stopListening = useCallback(() => { recRef.current?.stop(); stopAudio(); onListeningChange(false); }, [stopAudio, onListeningChange]);

  const handleClick = () => {
    if (isSpeaking) { window.speechSynthesis?.cancel(); return; }
    isListening ? stopListening() : startListening();
  };

  const scale = 1 + vol * 0.12;
  const glow  = active ? 0.55 + vol * 0.45 : 0.22;

  return (
    <button onClick={handleClick} className="relative flex items-center justify-center focus:outline-none select-none cursor-pointer" style={{ width: 240, height: 240 }}>
      {/* Outer haze */}
      <div className="absolute inset-0 rounded-full" style={{ background:`radial-gradient(circle, rgba(${rgb},${glow*0.3}) 0%, transparent 60%)`, transform:`scale(${1.8+vol*0.35})`, filter:"blur(28px)", transition:"all 0.08s" }}/>
      {/* Glow ring */}
      <div className="absolute rounded-full" style={{ width:180+vol*55, height:180+vol*55, background:`radial-gradient(circle, rgba(${rgb},${glow*0.45}) 0%, transparent 65%)`, filter:"blur(10px)", transition:"all 0.07s" }}/>
      {/* Orbit ring 1 */}
      <div className="absolute rounded-full animate-pulse" style={{ width:142+vol*28, height:142+vol*28, border:`1px solid rgba(${rgb},${active?0.55:0.18})`, transition:"all 0.08s" }}/>
      {/* Orbit ring 2 */}
      <div className="absolute rounded-full" style={{ width:108+vol*16, height:108+vol*16, border:`1px solid rgba(${rgb},${active?0.75:0.28})`, transition:"all 0.07s" }}/>
      {/* Sphere */}
      <div className="relative z-10 rounded-full flex items-center justify-center" style={{
        width:96, height:96,
        background: isListening ? "radial-gradient(circle at 33% 33%, #93c5fd, #1d4ed8 55%, #0f172a)"
                  : isSpeaking  ? "radial-gradient(circle at 33% 33%, #d8b4fe, #7c3aed 55%, #1e0040)"
                  :                "radial-gradient(circle at 33% 33%, #60a5fa, #1e40af 55%, #0f172a)",
        boxShadow: active ? `0 0 ${32+vol*48}px rgba(${rgb},0.85), 0 0 ${60+vol*32}px rgba(${rgb},0.35), inset 0 2px 8px rgba(255,255,255,0.22)` : `0 0 16px rgba(30,64,175,0.5), inset 0 2px 6px rgba(255,255,255,0.1)`,
        transform:`scale(${scale})`, border:"1px solid rgba(255,255,255,0.18)", transition:"transform 0.07s, box-shadow 0.07s",
      }}>
        <div className="absolute top-3 left-3 w-6 h-6 rounded-full" style={{ background:"radial-gradient(circle, rgba(255,255,255,0.42) 0%, transparent 70%)" }}/>
        {isSpeaking ? (
          <div className="flex gap-0.5 items-end h-6">
            {[0,1,2,3,4].map(i=><div key={i} className="w-1.5 bg-white/90 rounded-full animate-bounce" style={{ height:`${35+Math.sin(i*0.9)*45}%`, animationDelay:`${i*0.07}s`, animationDuration:"0.5s" }}/>)}
          </div>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={isListening?"text-white":"text-blue-200"}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
          </svg>
        )}
      </div>
      {active && <>
        <div className="absolute rounded-full animate-ping opacity-[0.12]" style={{ width:112, height:112, border:`1px solid rgba(${rgb},1)`, animationDuration:"1.8s" }}/>
        <div className="absolute rounded-full animate-ping opacity-[0.07]"  style={{ width:148, height:148, border:`1px solid rgba(${rgb},1)`, animationDuration:"2.4s", animationDelay:"0.6s" }}/>
      </>}
    </button>
  );
}

// ── Energy lines (SVG) ─────────────────────────────────────────────────────────
function EnergyLines({ agents }: { agents: Agent[] }) {
  // SVG is 480px wide, 80px tall. Orb bottom = center-top. Agent centers evenly spaced.
  const W = 480; const H = 80;
  const cx = W / 2;
  const agentXs = [60, 180, 300, 420];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible" style={{ display:"block" }}>
      <defs>
        <filter id="lglow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {agents.map((a, i) => {
        const ax = agentXs[i];
        const path = `M ${cx} 0 C ${cx} ${H*0.4} ${ax} ${H*0.6} ${ax} ${H}`;
        return (
          <g key={a.id} filter={a.working ? "url(#lglow)" : undefined}>
            {/* base dim path */}
            <path d={path} fill="none" stroke={`rgba(${a.glowRgb},${a.working?0.65:0.1})`} strokeWidth={a.working?1.5:0.8}
              strokeDasharray={a.working?"7 5":"3 8"}
              style={a.working ? { animation:`dash 0.9s linear infinite` } : undefined}
            />
            {/* bright particle */}
            {a.working && <path d={path} fill="none" stroke={`rgba(${a.glowRgb},0.95)`} strokeWidth={3}
              strokeDasharray="4 60" style={{ animation:`dash ${0.7+i*0.1}s linear infinite` }}
            />}
          </g>
        );
      })}
      <style>{`@keyframes dash { to { stroke-dashoffset: -80; } }`}</style>
    </svg>
  );
}

// ── Agent Card ─────────────────────────────────────────────────────────────────
function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className={`relative rounded-2xl border flex flex-col items-center gap-2 py-4 px-3 transition-all duration-300 ${
      agent.working ? "border-white/20 bg-white/[0.07]" : "border-white/[0.06] bg-white/[0.02]"
    }`} style={{ boxShadow: agent.working ? `0 0 20px rgba(${agent.glowRgb},0.18)` : "none" }}>
      <div className={`absolute top-0 inset-x-0 h-0.5 rounded-t-2xl bg-gradient-to-r ${agent.gradient} transition-opacity duration-300`} style={{ opacity: agent.working ? 1 : 0.35 }}/>
      {agent.working && <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${agent.gradient} opacity-[0.06] animate-pulse`}/>}
      <div className={`relative z-10 w-10 h-10 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center text-white shadow-lg`}
        style={{ boxShadow: agent.working ? `0 0 16px rgba(${agent.glowRgb},0.65)` : "none" }}>
        {agent.icon}
      </div>
      <div className="relative z-10 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
          style={{ backgroundColor: agent.working ? `rgb(${agent.glowRgb})` : "rgb(51,65,85)", boxShadow: agent.working ? `0 0 6px rgba(${agent.glowRgb},0.8)` : "none" }}/>
        <p className="text-white text-xs font-semibold">{agent.name}</p>
      </div>
      <p className="relative z-10 text-[11px] text-slate-500">{agent.role}</p>
    </div>
  );
}

// ── Active Task Card ───────────────────────────────────────────────────────────
function ActiveTaskCard({ task }: { task: ActiveTask }) {
  const isJarvis = task.assignee_id === "jarvis";
  return (
    <div className={`rounded-xl border p-4 transition-all ${
      isJarvis && task.status === "in-progress"
        ? "border-blue-500/30 bg-blue-950/20"
        : task.status === "done"
        ? "border-green-500/20 bg-green-950/10"
        : "border-white/[0.06] bg-white/[0.02]"
    }`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {task.status === "in-progress" ? <Loader2 size={14} className="text-blue-400 animate-spin"/> : task.status === "done" ? <CheckCircle2 size={14} className="text-green-400"/> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600 mt-0.5"/>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-snug">{task.title}</p>
          {isJarvis && task.status === "in-progress" && (
            <p className="text-[11px] text-blue-400 mt-1 flex items-center gap-1"><Bot size={10}/> Jarvis working on it...</p>
          )}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
          task.status === "in-progress" ? "bg-blue-900/50 text-blue-300" : task.status === "done" ? "bg-green-900/50 text-green-300" : "bg-slate-800 text-slate-400"
        }`}>{task.status}</span>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [messages, setMessages]        = useState<Message[]>([]);
  const [input, setInput]              = useState("");
  const [loading, setLoading]          = useState(false);
  const [isSpeaking, setIsSpeaking]    = useState(false);
  const [isListening, setIsListening]  = useState(false);
  const [agents, setAgents]            = useState<Agent[]>(AGENTS);
  const [tasks, setTasks]              = useState<ActiveTask[]>([]);
  const [chatOpen, setChatOpen]        = useState(false);
  const [lastReply, setLastReply]      = useState("");
  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const loadTasks = () => api.fetchTasks().then((d: ActiveTask[]) => {
    // Show in-progress + recent (last 6 non-done)
    const active = d.filter(t => t.status !== "done");
    const done   = d.filter(t => t.status === "done").slice(0, 2);
    setTasks([...active, ...done].slice(0, 8));
    const hasActive = active.some(t => t.assignee_id === "jarvis" && t.status === "in-progress");
    setAgents(prev => prev.map((a,i) => i===0 ? {...a, working: hasActive} : a));
  }).catch(()=>{});

  useEffect(() => {
    api.fetchMessages().then((rows: any[]) => {
      if (!rows.length) return;
      setMessages(rows.slice(-30).map(r => ({ id:r.id, role: r.sender==="matthew"?"user":"assistant", content:r.text })));
    }).catch(()=>{});
    loadTasks();
  }, []);

  useEffect(() => {
    const ch = supabase.channel("cmd-live")
      .on("postgres_changes", { event:"*", schema:"public", table:"tasks" }, () => loadTasks())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95; utt.pitch = 0.88;
    const vs = window.speechSynthesis.getVoices();
    const pref = [
      (v: SpeechSynthesisVoice) => v.name.includes("Daniel") && v.lang.startsWith("en"),
      (v: SpeechSynthesisVoice) => v.name.includes("Arthur"),
      (v: SpeechSynthesisVoice) => v.name.includes("Google UK English Male"),
      (v: SpeechSynthesisVoice) => v.lang === "en-GB",
      (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
    ];
    for (const fn of pref) { const m = vs.find(fn); if (m) { utt.voice = m; break; } }
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput(""); setLoading(true);
    const userMsg: Message = { id: Date.now().toString(), role:"user", content:text };
    setMessages(prev => [...prev, userMsg]);
    const history = [...messages, userMsg].slice(-20).map(m => ({ role:m.role, content:m.content }));
    const replyId = (Date.now()+1).toString();
    setMessages(prev => [...prev, { id:replyId, role:"assistant", content:"", streaming:true }]);
    try {
      const res = await fetch("/api/openclaw", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ messages:history }) });
      if (!res.ok || !res.body) throw new Error("err");
      const reader = res.body.getReader(); const dec = new TextDecoder(); let full="";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value,{stream:true}).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim(); if (d==="[DONE]") break;
          try { const delta = JSON.parse(d).choices?.[0]?.delta?.content; if (delta) { full+=delta; setMessages(prev=>prev.map(m=>m.id===replyId?{...m,content:full}:m)); } } catch {}
        }
      }
      setMessages(prev=>prev.map(m=>m.id===replyId?{...m,streaming:false}:m));
      if (full) { setLastReply(full); speak(full); api.createMessage({sender:"matthew",text}).catch(()=>{}); api.createMessage({sender:"jarvis",text:full}).catch(()=>{}); }
    } catch {
      setMessages(prev=>prev.map(m=>m.id===replyId?{...m,content:"Connection issue, sir.",streaming:false}:m));
    } finally { setLoading(false); setTimeout(()=>inputRef.current?.focus(),80); }
  };

  const activeTasks = tasks.filter(t => t.status !== "done");
  const doneTasks   = tasks.filter(t => t.status === "done");

  return (
    <div className="h-screen flex flex-col overflow-y-auto bg-[#060912]">

      {/* Stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({length:80}).map((_,i)=>(
          <div key={i} className="absolute rounded-full bg-white"
            style={{ width:Math.random()*1.8+0.3, height:Math.random()*1.8+0.3, top:`${Math.random()*100}%`, left:`${Math.random()*100}%`, opacity:Math.random()*0.35+0.05, animation:`pulse ${3+Math.random()*4}s ease-in-out infinite`, animationDelay:`${Math.random()*5}s` }}/>
        ))}
      </div>

      {/* Content — scrollable column */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-3xl mx-auto px-6 py-8 gap-10">

        {/* Header */}
        <div className="w-full flex items-center justify-between">
          <div>
            <p className="text-[10px] text-blue-500 tracking-[0.3em] uppercase font-medium">Jarvis Intelligence</p>
            <h1 className="text-2xl font-bold text-white tracking-wide mt-0.5">Command Center</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"/>
            All systems nominal
          </div>
        </div>

        {/* ── Orb ── */}
        <div className="flex flex-col items-center gap-3">
          <SpaceOrb
            onTranscript={sendMessage}
            isSpeaking={isSpeaking}
            isListening={isListening}
            onListeningChange={setIsListening}
          />
          <p className="text-[11px] tracking-[0.25em] uppercase transition-colors duration-300"
            style={{ color: isListening?"#60a5fa":isSpeaking?"#c084fc":"#334155" }}>
            {isListening ? "Listening..." : isSpeaking ? "Speaking — tap to stop" : "Tap to speak"}
          </p>
        </div>

        {/* ── Energy lines + Agents ── */}
        <div className="w-full flex flex-col items-center gap-0">
          <EnergyLines agents={agents}/>
          <div className="w-full grid grid-cols-4 gap-3">
            {agents.map(a => <AgentCard key={a.id} agent={a}/>)}
          </div>
        </div>

        {/* ── Active Tasks ── */}
        <div className="w-full">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Active Tasks</p>
            <div className="flex-1 h-px bg-slate-800"/>
            {activeTasks.length > 0 && (
              <span className="text-[10px] bg-blue-900/40 text-blue-400 border border-blue-800/50 px-2 py-0.5 rounded-full">
                {activeTasks.length} running
              </span>
            )}
          </div>

          {activeTasks.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-6 text-center">
              <p className="text-slate-600 text-sm">No active tasks — assign one to Jarvis from the Tasks page</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeTasks.map(t => <ActiveTaskCard key={t.id} task={t}/>)}
            </div>
          )}

          {doneTasks.length > 0 && (
            <div className="flex flex-col gap-2 mt-3 opacity-50">
              {doneTasks.map(t => <ActiveTaskCard key={t.id} task={t}/>)}
            </div>
          )}
        </div>

        {/* ── Last reply ghost text OR chat ── */}
        <div className="w-full">
          <button onClick={() => setChatOpen(v=>!v)}
            className="flex items-center gap-2 text-[10px] text-slate-700 hover:text-slate-500 uppercase tracking-widest transition-colors mb-3">
            {chatOpen ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
            {chatOpen ? "Hide conversation" : "Show conversation"}
          </button>

          {chatOpen && (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}>
                  <div className={`max-w-[80%] px-3.5 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role==="user"
                      ? "bg-blue-600/25 text-blue-100 border border-blue-700/25"
                      : "bg-white/[0.04] text-slate-300 border border-white/[0.05]"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.streaming && <span className="inline-block w-1 h-3 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm"/>}
                  </div>
                </div>
              ))}
              {loading && messages[messages.length-1]?.content==="" && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.05] flex gap-1">
                    {[0,120,240].map(d=><div key={d} className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
                  </div>
                </div>
              )}
              <div ref={scrollRef}/>
            </div>
          )}

          {!chatOpen && lastReply && (
            <p className="text-slate-700 text-xs italic text-center leading-relaxed line-clamp-2">
              "{lastReply}"
            </p>
          )}
        </div>

        {/* Spacer so input doesn't overlap last content */}
        <div className="h-4"/>
      </div>

      {/* ── Sticky input bar ── */}
      <div className="sticky bottom-0 z-20 w-full bg-gradient-to-t from-[#060912] via-[#060912]/95 to-transparent pt-6 pb-5 px-6">
        <div className="flex gap-2 bg-white/[0.05] backdrop-blur border border-white/[0.08] rounded-2xl px-4 py-3 max-w-xl mx-auto">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Command Jarvis..."
            className="flex-1 bg-transparent text-white placeholder:text-slate-700 text-sm focus:outline-none"
            disabled={loading}
            autoFocus
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            className="text-slate-600 hover:text-blue-400 transition-colors disabled:opacity-25">
            <Send size={15}/>
          </button>
        </div>
      </div>

    </div>
  );
}

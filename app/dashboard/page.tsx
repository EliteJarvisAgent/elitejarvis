"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Globe, Activity, BarChart3, Cog, Loader2, CheckCircle2, ChevronDown, ChevronUp, Bot, Plus, Radio } from "lucide-react";
import { api } from "@/lib/backend-client";
import { supabase } from "@/lib/supabase-safe-client";
import Link from "next/link";

// ── Wake trigger hook — double clap + "daddy's home" phrase ───────────────────
function useWakeTrigger(onWake: () => void, disabled: boolean) {
  const activeRef    = useRef(false);
  const onWakeRef    = useRef(onWake);
  const disabledRef  = useRef(disabled);
  onWakeRef.current  = onWake;
  disabledRef.current = disabled;

  useEffect(() => {
    if (typeof window === "undefined") return;
    activeRef.current = true;
    let animFrame = 0;
    let clapStream: MediaStream | null = null;
    let recognition: any = null;
    let lastSpike = 0;
    let clapCount = 0;
    let recRestarting = false;

    // ── Clap detection ──────────────────────────────────────────────────────
    async function startClap() {
      try {
        clapStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx      = new AudioContext();
        const src      = ctx.createMediaStreamSource(clapStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (!activeRef.current) return;
          analyser.getByteFrequencyData(data);
          const peak = Math.max(...Array.from(data));
          const now  = Date.now();

          if (peak > 175) {
            const gap = now - lastSpike;
            if (gap > 80 && gap < 700) {
              clapCount++;
              if (clapCount >= 2 && !disabledRef.current) {
                clapCount = 0;
                onWakeRef.current();
              }
            } else if (gap >= 700) {
              clapCount = 1;
            }
            lastSpike = now;
          }
          animFrame = requestAnimationFrame(tick);
        };
        tick();
      } catch {}
    }

    // ── Phrase detection — continuous recognition ───────────────────────────
    function startPhrase() {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return;
      recognition = new SR();
      recognition.continuous    = true;
      recognition.interimResults = true;
      recognition.lang          = "en-US";

      recognition.onresult = (e: any) => {
        if (disabledRef.current) return;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript.toLowerCase();
          if (
            t.includes("daddy") ||
            t.includes("wake up") ||
            t.includes("jarvis wake") ||
            t.includes("good morning jarvis")
          ) {
            onWakeRef.current();
          }
        }
      };

      recognition.onend = () => {
        if (!activeRef.current || recRestarting) return;
        recRestarting = true;
        setTimeout(() => {
          recRestarting = false;
          if (activeRef.current) {
            try { recognition.start(); } catch {}
          }
        }, 1000);
      };

      try { recognition.start(); } catch {}
    }

    startClap();
    startPhrase();

    return () => {
      activeRef.current = false;
      cancelAnimationFrame(animFrame);
      clapStream?.getTracks().forEach(t => t.stop());
      try { recognition?.stop(); } catch {}
    };
  }, []); // run once on mount
}

interface Message { id: string; role: "user"|"assistant"; content: string; streaming?: boolean; }
interface ActiveTask { id: string; title: string; status: string; assignee_id: string|null; }
interface Agent { id: string; name: string; role: string; working: boolean; glowRgb: string; gradient: string; icon: React.ReactNode; }

const AGENTS: Agent[] = [
  { id:"atlas",  name:"Atlas",  role:"Website",   working:false, glowRgb:"34,211,238",  gradient:"from-cyan-500 to-blue-600",    icon:<Globe     size={17}/> },
  { id:"oracle", name:"Oracle", role:"Research",  working:false, glowRgb:"167,139,250", gradient:"from-violet-500 to-purple-700",icon:<Activity  size={17}/> },
  { id:"cipher", name:"Cipher", role:"Marketing", working:false, glowRgb:"244,114,182", gradient:"from-pink-500 to-rose-700",    icon:<BarChart3 size={17}/> },
  { id:"vector", name:"Vector", role:"Ops",       working:false, glowRgb:"251,191,36",  gradient:"from-amber-500 to-orange-600", icon:<Cog       size={17}/> },
];

// ── Space Orb ─────────────────────────────────────────────────────────────────
function SpaceOrb({ onTranscript, isSpeaking, isListening, onListeningChange }: {
  onTranscript:(t:string)=>void; isSpeaking:boolean; isListening:boolean; onListeningChange:(v:boolean)=>void;
}) {
  const [volume,setVolume]=useState(0); const [jVol,setJVol]=useState(0);
  const recRef=useRef<any>(null); const analyser=useRef<AnalyserNode|null>(null);
  const frame=useRef<number>(0); const stream=useRef<MediaStream|null>(null); const emitted=useRef(false);

  useEffect(()=>{ if(!isSpeaking){setJVol(0);return;} const id=setInterval(()=>setJVol(0.3+Math.random()*0.7),55); return()=>clearInterval(id); },[isSpeaking]);

  const vol=isListening?volume:isSpeaking?jVol:0; const active=isListening||isSpeaking;
  const rgb=isListening?"59,130,246":isSpeaking?"139,92,246":"30,64,175";

  const stopAudio=useCallback(()=>{ cancelAnimationFrame(frame.current); stream.current?.getTracks().forEach(t=>t.stop()); stream.current=null; analyser.current=null; setVolume(0); },[]);

  const startListening=useCallback(async()=>{
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition; if(!SR)return;
    emitted.current=false;
    const rec=new SR();
    rec.lang="en-US";
    rec.continuous=true;
    rec.interimResults=true;
    recRef.current=rec;
    try {
      const s=await navigator.mediaDevices.getUserMedia({audio:true}); stream.current=s;
      const ctx=new AudioContext(); const src=ctx.createMediaStreamSource(s);
      const an=ctx.createAnalyser(); an.fftSize=256; src.connect(an); analyser.current=an;
      const data=new Uint8Array(an.frequencyBinCount);
      const tick=()=>{an.getByteFrequencyData(data);setVolume(Math.min(data.reduce((a,b)=>a+b,0)/data.length/80,1));frame.current=requestAnimationFrame(tick);};tick();
    }catch{}
    rec.onresult=(e:any)=>{
      let final="";
      for(let i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal) final+=e.results[i][0].transcript;
      }
      if(final.trim()&&!emitted.current){
        emitted.current=true;
        rec.stop();
        onTranscript(final.trim());
      }
    };
    rec.onend=()=>{stopAudio();onListeningChange(false);};
    rec.start();
    onListeningChange(true);
  },[onTranscript,stopAudio,onListeningChange]);

  const stopListening=useCallback(()=>{recRef.current?.stop();stopAudio();onListeningChange(false);},[stopAudio,onListeningChange]);

  const handleClick=()=>{ if(isSpeaking){window.speechSynthesis?.cancel();return;} isListening?stopListening():startListening(); };
  const scale=1+vol*0.12; const glow=active?0.55+vol*0.45:0.22;

  return(
    <button onClick={handleClick} className="relative flex items-center justify-center focus:outline-none select-none" style={{width:220,height:220}}>
      <div className="absolute inset-0 rounded-full" style={{background:`radial-gradient(circle,rgba(${rgb},${glow*0.28}) 0%,transparent 60%)`,transform:`scale(${1.8+vol*0.35})`,filter:"blur(28px)",transition:"all 0.08s"}}/>
      <div className="absolute rounded-full" style={{width:175+vol*55,height:175+vol*55,background:`radial-gradient(circle,rgba(${rgb},${glow*0.42}) 0%,transparent 65%)`,filter:"blur(10px)",transition:"all 0.07s"}}/>
      <div className="absolute rounded-full animate-pulse" style={{width:138+vol*28,height:138+vol*28,border:`1px solid rgba(${rgb},${active?0.55:0.18})`,transition:"all 0.08s"}}/>
      <div className="absolute rounded-full" style={{width:105+vol*16,height:105+vol*16,border:`1px solid rgba(${rgb},${active?0.75:0.28})`,transition:"all 0.07s"}}/>
      <div className="relative z-10 rounded-full flex items-center justify-center" style={{
        width:90,height:90,
        background:isListening?"radial-gradient(circle at 33% 33%,#93c5fd,#1d4ed8 55%,#0f172a)":isSpeaking?"radial-gradient(circle at 33% 33%,#d8b4fe,#7c3aed 55%,#1e0040)":"radial-gradient(circle at 33% 33%,#60a5fa,#1e40af 55%,#0f172a)",
        boxShadow:active?`0 0 ${30+vol*48}px rgba(${rgb},0.85),0 0 ${58+vol*32}px rgba(${rgb},0.35),inset 0 2px 8px rgba(255,255,255,0.22)`:`0 0 16px rgba(30,64,175,0.5),inset 0 2px 6px rgba(255,255,255,0.1)`,
        transform:`scale(${scale})`,border:"1px solid rgba(255,255,255,0.18)",transition:"transform 0.07s,box-shadow 0.07s",
      }}>
        <div className="absolute top-3 left-3 w-5 h-5 rounded-full" style={{background:"radial-gradient(circle,rgba(255,255,255,0.42) 0%,transparent 70%)"}}/>
        {isSpeaking?(
          <div className="flex gap-0.5 items-end h-5">{[0,1,2,3,4].map(i=><div key={i} className="w-1.5 bg-white/90 rounded-full animate-bounce" style={{height:`${35+Math.sin(i*0.9)*45}%`,animationDelay:`${i*0.07}s`,animationDuration:"0.5s"}}/>)}</div>
        ):(
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={isListening?"text-white":"text-blue-200"}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
          </svg>
        )}
      </div>
      {active&&<><div className="absolute rounded-full animate-ping opacity-[0.12]" style={{width:108,height:108,border:`1px solid rgba(${rgb},1)`,animationDuration:"1.8s"}}/><div className="absolute rounded-full animate-ping opacity-[0.06]" style={{width:145,height:145,border:`1px solid rgba(${rgb},1)`,animationDuration:"2.4s",animationDelay:"0.6s"}}/></>}
    </button>
  );
}

// ── Energy lines ──────────────────────────────────────────────────────────────
function EnergyLines({agents}:{agents:Agent[]}) {
  const W=1000,H=70; const cx=W/2; const xs=[125,375,625,875];
  return(
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible block">
      <defs><filter id="lg"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {agents.map((a,i)=>{
        const ax=xs[i]; const path=`M ${cx} 0 C ${cx} ${H*0.5} ${ax} ${H*0.5} ${ax} ${H}`;
        return(<g key={a.id} filter={a.working?"url(#lg)":undefined}>
          <path d={path} fill="none" stroke={`rgba(${a.glowRgb},${a.working?0.65:0.1})`} strokeWidth={a.working?1.5:0.8} strokeDasharray={a.working?"7 5":"3 8"} style={a.working?{animation:"dash 0.9s linear infinite"}:undefined}/>
          {a.working&&<path d={path} fill="none" stroke={`rgba(${a.glowRgb},0.95)`} strokeWidth={3} strokeDasharray="4 60" style={{animation:`dash ${0.7+i*0.1}s linear infinite`}}/>}
        </g>);
      })}
      <style>{`@keyframes dash{to{stroke-dashoffset:-80}}`}</style>
    </svg>
  );
}

// ── Agent card ────────────────────────────────────────────────────────────────
function AgentCard({agent}:{agent:Agent}) {
  return(
    <div className={`relative rounded-xl border flex flex-col items-center gap-2 py-4 px-2 transition-all duration-300 ${agent.working?"border-white/20 bg-white/[0.07]":"border-white/[0.06] bg-white/[0.02]"}`}
      style={{boxShadow:agent.working?`0 0 18px rgba(${agent.glowRgb},0.18)`:"none"}}>
      <div className={`absolute top-0 inset-x-0 h-0.5 rounded-t-xl bg-gradient-to-r ${agent.gradient}`} style={{opacity:agent.working?1:0.35}}/>
      {agent.working&&<div className={`absolute inset-0 rounded-xl bg-gradient-to-b ${agent.gradient} opacity-[0.06] animate-pulse`}/>}
      <div className={`relative z-10 w-9 h-9 rounded-lg bg-gradient-to-br ${agent.gradient} flex items-center justify-center text-white`}
        style={{boxShadow:agent.working?`0 0 14px rgba(${agent.glowRgb},0.65)`:"none"}}>
        {agent.icon}
      </div>
      <div className="relative z-10 flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:agent.working?`rgb(${agent.glowRgb})`:"rgb(51,65,85)",boxShadow:agent.working?`0 0 6px rgba(${agent.glowRgb},0.8)`:"none"}}/>
        <p className="text-white text-[11px] font-semibold">{agent.name}</p>
      </div>
      <p className="relative z-10 text-[10px] text-slate-500">{agent.role}</p>
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({task}:{task:ActiveTask}) {
  const jarvis = task.assignee_id==="jarvis";
  const inProg = task.status==="in-progress";
  const done   = task.status==="done";
  return(
    <div className={`rounded-xl border p-3.5 transition-all ${inProg&&jarvis?"border-blue-500/25 bg-blue-950/15":done?"border-green-500/15 bg-green-950/10":"border-white/[0.06] bg-white/[0.02]"}`}>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex-shrink-0">
          {inProg?<Loader2 size={13} className="text-blue-400 animate-spin"/>:done?<CheckCircle2 size={13} className="text-green-400"/>:<div className="w-3 h-3 rounded-full border border-slate-700 mt-0.5"/>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-snug line-clamp-2">{task.title}</p>
          {jarvis&&inProg&&<p className="text-[10px] text-blue-400 mt-1 flex items-center gap-1"><Bot size={9}/>Jarvis on it...</p>}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [messages,setMessages]         = useState<Message[]>([]);
  const [input,setInput]               = useState("");
  const [loading,setLoading]           = useState(false);
  const [isSpeaking,setIsSpeaking]     = useState(false);
  const [isListening,setIsListening]   = useState(false);
  const [agents,setAgents]             = useState<Agent[]>(AGENTS);
  const [tasks,setTasks]               = useState<ActiveTask[]>([]);
  const [chatOpen,setChatOpen]         = useState(false);
  const [lastReply,setLastReply]       = useState("");
  const [wakeFlash,setWakeFlash]       = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const handleWake = useCallback(() => {
    setWakeFlash(true);
    setTimeout(() => setWakeFlash(false), 2000);
    sendMessage("Daddy's home. Give me a full briefing — weather in Floyd's Knobs, any active tasks Jarvis is working on, and what I should focus on today. Keep it sharp, sir.");
  }, []); // sendMessage added below via ref

  // Keep sendMessage ref stable for the wake hook
  const sendMessageRef = useRef<(t: string) => void>(() => {});

  const stableWake = useCallback(() => {
    sendMessageRef.current("Daddy's home. Give me a full briefing — weather in Floyd's Knobs, any active tasks Jarvis is working on, and what I should focus on today. Keep it sharp, sir.");
    setWakeFlash(true);
    setTimeout(() => setWakeFlash(false), 2000);
  }, []);

  useWakeTrigger(stableWake, loading || isListening);

  useEffect(()=>{scrollRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const loadTasks=useCallback(()=>api.fetchTasks().then((d:ActiveTask[])=>{
    const active=d.filter(t=>t.status!=="done");
    const done=d.filter(t=>t.status==="done").slice(0,3);
    setTasks([...active,...done].slice(0,10));
    const hasActive=active.some(t=>t.assignee_id==="jarvis"&&t.status==="in-progress");
    setAgents(prev=>prev.map((a,i)=>i===0?{...a,working:hasActive}:a));
  }).catch(()=>{}),[]);

  useEffect(()=>{
    api.fetchMessages().then((rows:any[])=>{
      if(!rows.length)return;
      setMessages(rows.slice(-30).map(r=>({id:r.id,role:r.sender==="matthew"?"user":"assistant",content:r.text})));
    }).catch(()=>{});
    loadTasks();
  },[loadTasks]);

  useEffect(()=>{
    const ch=supabase.channel("cmd-live").on("postgres_changes",{event:"*",schema:"public",table:"tasks"},()=>loadTasks()).subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[loadTasks]);

  const speak=(text:string)=>{
    if(typeof window==="undefined")return;
    window.speechSynthesis.cancel();
    const utt=new SpeechSynthesisUtterance(text); utt.rate=0.95; utt.pitch=0.88;
    utt.onstart=()=>setIsSpeaking(true); utt.onend=()=>setIsSpeaking(false); utt.onerror=()=>setIsSpeaking(false);
    const doSpeak=()=>{
      const vs=window.speechSynthesis.getVoices();
      const pref=[(v:SpeechSynthesisVoice)=>v.name.includes("Daniel")&&v.lang.startsWith("en"),(v:SpeechSynthesisVoice)=>v.name.includes("Arthur"),(v:SpeechSynthesisVoice)=>v.name.includes("Google UK English Male"),(v:SpeechSynthesisVoice)=>v.lang==="en-GB",(v:SpeechSynthesisVoice)=>v.lang.startsWith("en")];
      for(const fn of pref){const m=vs.find(fn);if(m){utt.voice=m;break;}}
      window.speechSynthesis.speak(utt);
    };
    if(window.speechSynthesis.getVoices().length>0){doSpeak();}
    else{window.speechSynthesis.addEventListener("voiceschanged",doSpeak,{once:true});}
  };

  // Keep ref in sync so wake trigger always calls current sendMessage
  useEffect(() => { sendMessageRef.current = sendMessage; });

  async function sendMessage(text:string) {
    if(!text.trim()||loading)return; setInput(""); setLoading(true);
    const userMsg:Message={id:Date.now().toString(),role:"user",content:text};
    setMessages(prev=>[...prev,userMsg]);
    const history=[...messages,userMsg].slice(-20).map(m=>({role:m.role,content:m.content}));
    const replyId=(Date.now()+1).toString();
    setMessages(prev=>[...prev,{id:replyId,role:"assistant",content:"",streaming:true}]);
    try{
      const res=await fetch("/api/openclaw",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history})});
      if(!res.ok||!res.body)throw new Error("err");
      const reader=res.body.getReader(); const dec=new TextDecoder(); let full="";
      while(true){
        const{done,value}=await reader.read(); if(done)break;
        for(const line of dec.decode(value,{stream:true}).split("\n")){
          if(!line.startsWith("data: "))continue; const d=line.slice(6).trim(); if(d==="[DONE]")break;
          try{const delta=JSON.parse(d).choices?.[0]?.delta?.content;if(delta){full+=delta;setMessages(prev=>prev.map(m=>m.id===replyId?{...m,content:full}:m));}}catch{}
        }
      }
      setMessages(prev=>prev.map(m=>m.id===replyId?{...m,streaming:false}:m));
      if(full){setLastReply(full);speak(full);api.createMessage({sender:"matthew",text}).catch(()=>{});api.createMessage({sender:"jarvis",text:full}).catch(()=>{});}
    }catch{setMessages(prev=>prev.map(m=>m.id===replyId?{...m,content:"Connection issue, sir.",streaming:false}:m));}
    finally{setLoading(false);setTimeout(()=>inputRef.current?.focus(),80);}
  };

  const activeTasks=tasks.filter(t=>t.status!=="done");
  const doneTasks=tasks.filter(t=>t.status==="done");

  return(
    <div className="h-full flex overflow-hidden bg-[#060912]">

      {/* Stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({length:80}).map((_,i)=>(
          <div key={i} className="absolute rounded-full bg-white" style={{width:Math.random()*1.8+0.3,height:Math.random()*1.8+0.3,top:`${Math.random()*100}%`,left:`${Math.random()*100}%`,opacity:Math.random()*0.35+0.05,animation:`pulse ${3+Math.random()*4}s ease-in-out infinite`,animationDelay:`${Math.random()*5}s`}}/>
        ))}
      </div>

      {/* ── LEFT: Orb + agents + chat ── */}
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

        {/* Header */}
        <div className="w-full flex items-center justify-between px-8 pt-6 pb-6">
          <div>
            <p className="text-[10px] text-blue-500 tracking-[0.3em] uppercase font-medium">Jarvis Intelligence</p>
            <h1 className="text-2xl font-bold text-white tracking-wide mt-0.5">Command Center</h1>
          </div>
          <div className="flex items-center gap-3">
            {wakeFlash && (
              <span className="flex items-center gap-1.5 text-[11px] text-blue-400 animate-pulse">
                <Radio size={11}/> Wake triggered
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"/>
              All systems nominal
            </span>
          </div>
        </div>

        {/* Orb — centered in full width */}
        <div className="flex flex-col items-center">
          <SpaceOrb onTranscript={sendMessage} isSpeaking={isSpeaking} isListening={isListening} onListeningChange={setIsListening}/>
          <p className="text-[11px] tracking-[0.25em] uppercase mt-2 mb-6 transition-colors duration-300"
            style={{color:isListening?"#60a5fa":isSpeaking?"#c084fc":"#334155"}}>
            {isListening?"Listening...":isSpeaking?"Speaking — tap to stop":"Tap to speak"}
          </p>
        </div>

        {/* Energy lines + agents — stretch to fill width */}
        <div className="flex flex-col items-center gap-0 px-6">
          <EnergyLines agents={agents}/>
          <div className="w-full grid grid-cols-4 gap-4">
            {agents.map(a=><AgentCard key={a.id} agent={a}/>)}
          </div>
        </div>

        {/* Chat section */}
        <div className="w-full px-6 mt-8">
          <button onClick={()=>setChatOpen(v=>!v)}
            className="flex items-center gap-2 text-[10px] text-slate-700 hover:text-slate-500 uppercase tracking-widest transition-colors mb-3">
            {chatOpen?<ChevronUp size={11}/>:<ChevronDown size={11}/>}
            {chatOpen?"Hide conversation":"Show conversation"}
          </button>
          {chatOpen&&(
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
              {messages.map(msg=>(
                <div key={msg.id} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}>
                  <div className={`max-w-[80%] px-3.5 py-2 rounded-xl text-xs leading-relaxed ${msg.role==="user"?"bg-blue-600/25 text-blue-100 border border-blue-700/25":"bg-white/[0.04] text-slate-300 border border-white/[0.05]"}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.streaming&&<span className="inline-block w-1 h-3 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm"/>}
                  </div>
                </div>
              ))}
              {loading&&messages[messages.length-1]?.content===""&&(
                <div className="flex justify-start"><div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.05] flex gap-1">{[0,120,240].map(d=><div key={d} className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</div></div>
              )}
              <div ref={scrollRef}/>
            </div>
          )}
          {!chatOpen&&lastReply&&(
            <p className="text-slate-700 text-xs italic text-center leading-relaxed line-clamp-2">"{lastReply}"</p>
          )}
        </div>
        </div>{/* end scrollable */}

        {/* ── Input bar — pinned to bottom of left column ── */}
        <div className="flex-shrink-0 bg-gradient-to-t from-[#060912] via-[#060912]/95 to-transparent pt-4 pb-5 px-6">
          <div className="flex gap-2 bg-white/[0.05] backdrop-blur border border-white/[0.08] rounded-2xl px-4 py-3">
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage(input);}}}
              placeholder="Command Jarvis..." className="flex-1 bg-transparent text-white placeholder:text-slate-700 text-sm focus:outline-none"
              disabled={loading} autoFocus/>
            <button onClick={()=>sendMessage(input)} disabled={loading||!input.trim()} className="text-slate-600 hover:text-blue-400 transition-colors disabled:opacity-25">
              <Send size={15}/>
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Tasks panel ── */}
      <div className="relative z-10 w-80 flex-shrink-0 border-l border-white/[0.04] bg-white/[0.01] flex flex-col">
        <div className="px-5 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Active Tasks</p>
            {activeTasks.length>0&&<p className="text-blue-400 text-[11px] mt-0.5">{activeTasks.length} running</p>}
          </div>
          <Link href="/tasks" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1">
            <Plus size={10}/> New
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col gap-3">
          {activeTasks.length===0&&doneTasks.length===0?(
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5 text-center mt-4">
              <p className="text-slate-600 text-xs leading-relaxed">No tasks yet.<br/>Tell Jarvis what to do or go to Tasks.</p>
            </div>
          ):<>
            {activeTasks.map(t=><TaskCard key={t.id} task={t}/>)}
            {doneTasks.length>0&&(
              <>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-[10px] text-slate-700 uppercase tracking-widest">Completed</p>
                  <div className="flex-1 h-px bg-slate-800/60"/>
                </div>
                <div className="flex flex-col gap-2 opacity-40">
                  {doneTasks.map(t=><TaskCard key={t.id} task={t}/>)}
                </div>
              </>
            )}
          </>}
        </div>
      </div>

    </div>
  );
}

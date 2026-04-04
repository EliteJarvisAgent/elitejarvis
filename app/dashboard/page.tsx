"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Bot, Zap, Activity, Globe, BarChart3, Cog, Plus } from "lucide-react";
import { api } from "@/lib/backend-client";
import { SpaceOrb } from "@/components/SpaceOrb";
import { supabase } from "@/lib/supabase-safe-client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface SubAgent {
  id: string;
  name: string;
  role: string;
  status: "online" | "working" | "idle";
  icon: React.ReactNode;
  color: string;
  lastAction?: string;
}

const DEFAULT_AGENTS: SubAgent[] = [
  {
    id: "website",
    name: "Atlas",
    role: "Website Agent",
    status: "online",
    icon: <Globe size={16} />,
    color: "from-cyan-600 to-blue-700",
    lastAction: "Manages jarviselite.ai",
  },
  {
    id: "research",
    name: "Oracle",
    role: "Research Agent",
    status: "online",
    icon: <Activity size={16} />,
    color: "from-violet-600 to-purple-700",
    lastAction: "Web intel & analysis",
  },
  {
    id: "marketing",
    name: "Cipher",
    role: "Marketing Agent",
    status: "idle",
    icon: <BarChart3 size={16} />,
    color: "from-pink-600 to-rose-700",
    lastAction: "Campaigns & content",
  },
  {
    id: "ops",
    name: "Vector",
    role: "Operations Agent",
    status: "idle",
    icon: <Cog size={16} />,
    color: "from-amber-600 to-orange-700",
    lastAction: "Tasks & automation",
  },
];

const STATUS_COLOR: Record<string, string> = {
  online:  "bg-green-400",
  working: "bg-blue-400 animate-pulse",
  idle:    "bg-slate-500",
};

export default function DashboardPage() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [agents, setAgents]       = useState<SubAgent[]>(DEFAULT_AGENTS);
  const [activeTasks, setActiveTasks] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load history + track active tasks
  useEffect(() => {
    api.fetchMessages().then((rows: any[]) => {
      if (!rows.length) return;
      setMessages(rows.slice(-40).map((r) => ({
        id: r.id,
        role: r.sender === "matthew" ? "user" : "assistant",
        content: r.text,
        timestamp: new Date(r.timestamp),
      })));
    }).catch(() => {});

    api.fetchTasks().then((tasks: any[]) => {
      const active = tasks.filter((t) => t.status === "in-progress" && t.assignee_id === "jarvis");
      setActiveTasks(active.length);
      // Mark sub-agents as working if there are active tasks
      if (active.length > 0) {
        setAgents((prev) => prev.map((a, i) => i === 0 ? { ...a, status: "working" } : a));
      }
    }).catch(() => {});
  }, []);

  // Realtime: watch for agent activity
  useEffect(() => {
    const ch = supabase.channel("dash-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, (payload) => {
        const t = payload.new as any;
        const isActive = t.status === "in-progress" && t.assignee_id === "jarvis";
        setAgents((prev) => prev.map((a, i) => i === 0 ? { ...a, status: isActive ? "working" : "online", lastAction: isActive ? `Working: ${t.title?.slice(0,30)}...` : "Manages jarviselite.ai" } : a));
        setActiveTasks((n) => isActive ? Math.max(n, 1) : 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95; utt.pitch = 0.88;
    const voices = window.speechSynthesis.getVoices();
    const preferred = [
      (v: SpeechSynthesisVoice) => v.name.includes("Daniel") && v.lang.startsWith("en"),
      (v: SpeechSynthesisVoice) => v.name.includes("Arthur"),
      (v: SpeechSynthesisVoice) => v.name.includes("Google UK English Male"),
      (v: SpeechSynthesisVoice) => v.lang === "en-GB",
      (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
    ];
    for (const fn of preferred) { const m = voices.find(fn); if (m) { utt.voice = m; break; } }
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    const history = [...messages, userMsg].slice(-20).map((m) => ({ role: m.role, content: m.content }));
    const replyId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: replyId, role: "assistant", content: "", timestamp: new Date(), streaming: true }]);

    try {
      const res = await fetch("/api/openclaw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("Stream error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim();
          if (d === "[DONE]") break;
          try {
            const delta = JSON.parse(d).choices?.[0]?.delta?.content;
            if (delta) { fullText += delta; setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, content: fullText } : m)); }
          } catch {}
        }
      }

      setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, streaming: false } : m));
      if (fullText) {
        speak(fullText);
        api.createMessage({ sender: "matthew", text }).catch(() => {});
        api.createMessage({ sender: "jarvis", text: fullText }).catch(() => {});
      }
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === replyId ? { ...m, content: "Connection issue, sir. Try again.", streaming: false } : m
      ));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-[#080c14]">

      {/* Starfield background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 0.5,
              height: Math.random() * 2 + 0.5,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1,
              animation: `pulse ${2 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">JARVIS</h1>
          <p className="text-xs text-blue-400 tracking-widest uppercase">Command Center</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {activeTasks > 0 ? `${activeTasks} agent${activeTasks > 1 ? "s" : ""} working` : "All systems online"}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center overflow-hidden px-4 pb-4 gap-4">

        {/* Orb + message feed */}
        <div className="flex flex-col items-center flex-shrink-0 pt-2">
          <SpaceOrb
            onTranscript={sendMessage}
            isSpeaking={isSpeaking}
            isListening={isListening}
            onListeningChange={setIsListening}
          />
          <p className="text-xs mt-3 tracking-widest uppercase text-center"
            style={{ color: isListening ? "#60a5fa" : isSpeaking ? "#c084fc" : "#475569" }}>
            {isListening ? "Listening..." : isSpeaking ? "Speaking — tap to interrupt" : "Tap to speak"}
          </p>
        </div>

        {/* Message feed */}
        <div className="w-full max-w-2xl flex-1 overflow-y-auto space-y-3 px-2">
          {messages.length === 0 && !loading && (
            <div className="text-center pt-4">
              <p className="text-slate-600 text-sm">Tap the orb or type below to talk to Jarvis</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {["Update the website", "Research competitors", "Create a marketing plan", "What's the weather?"].map((s) => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="text-xs text-blue-400 bg-blue-950/40 border border-blue-800/50 hover:border-blue-500 rounded-full px-3 py-1.5 transition-colors">
                    <Zap size={10} className="inline mr-1" />{s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1"
                    style={{ background: "radial-gradient(circle at 35% 35%, #60a5fa, #1e40af)" }}>
                    <Bot size={12} className="text-white" />
                  </div>
                )}
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600/80 text-white rounded-br-sm backdrop-blur-sm"
                    : "bg-slate-800/80 text-slate-100 rounded-bl-sm backdrop-blur-sm border border-slate-700/50"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.streaming && <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm" />}
                </div>
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "radial-gradient(circle at 35% 35%, #60a5fa, #1e40af)" }}>
                  <Bot size={12} className="text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-slate-800/80 border border-slate-700/50 flex items-center gap-1">
                  {[0,150,300].map((d) => (
                    <div key={d} className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Text input */}
        <div className="w-full max-w-2xl flex-shrink-0">
          <div className="flex gap-2 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-2xl px-3 py-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Command Jarvis..."
              className="bg-transparent border-0 text-white placeholder:text-slate-600 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={loading}
              autoFocus
            />
            <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl h-8 w-8 p-0 flex-shrink-0">
              <Send size={13} />
            </Button>
          </div>
        </div>

        {/* Sub-agents */}
        <div className="w-full flex-shrink-0">
          <div className="flex items-center gap-2 mb-2 px-1">
            <p className="text-xs text-slate-600 uppercase tracking-widest font-medium">Agent Network</p>
            <div className="flex-1 h-px bg-slate-800" />
            <button className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1 transition-colors">
              <Plus size={11} /> Add Agent
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {agents.map((agent) => (
              <div key={agent.id}
                className="relative rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-3 hover:border-slate-600 transition-all cursor-pointer group overflow-hidden"
              >
                {/* Subtle gradient top border */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${agent.color} opacity-60`} />

                {/* Working pulse overlay */}
                {agent.status === "working" && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${agent.color} opacity-5 animate-pulse rounded-xl`} />
                )}

                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center text-white flex-shrink-0`}>
                    {agent.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{agent.name}</p>
                    <p className="text-slate-500 text-[10px] truncate">{agent.role}</p>
                  </div>
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLOR[agent.status]}`} />
                </div>

                <p className="text-[10px] text-slate-600 truncate">{agent.lastAction}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

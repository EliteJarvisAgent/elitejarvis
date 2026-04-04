"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/backend-client";
import { VoiceOrb } from "@/components/VoiceOrb";
import { supabase } from "@/lib/supabase-safe-client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assignee_id: string | null;
}

const SUGGESTIONS = [
  "Update the website header color",
  "Research top roofing competitors in Louisville",
  "Create a landing page for Elite Exteriors",
  "Write a marketing plan for Elite AI",
  "Build a quote calculator for roofing jobs",
  "Check the weather in Floyd's Knobs",
];

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "At your service, sir. I'm online with full capabilities — I can update the website, build things, research, manage tasks, and more. What do you need?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load recent chat + tasks
  useEffect(() => {
    api.fetchMessages().then((rows: any[]) => {
      if (!rows.length) return;
      const history: Message[] = rows.slice(-30).map((r) => ({
        id: r.id,
        role: r.sender === "matthew" ? "user" : "assistant",
        content: r.text,
        timestamp: new Date(r.timestamp),
      }));
      setMessages(history);
    }).catch(() => {});

    api.fetchTasks().then((tasks: Task[]) => {
      setRecentTasks(tasks.slice(0, 5));
    }).catch(() => {});
  }, []);

  // Live task updates
  useEffect(() => {
    const channel = supabase
      .channel("dash-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        api.fetchTasks().then((tasks: Task[]) => setRecentTasks(tasks.slice(0, 5))).catch(() => {});
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

    const history = [...messages, userMsg].slice(-20).map((m) => ({
      role: m.role, content: m.content,
    }));

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
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, content: fullText } : m));
            }
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
        m.id === replyId ? { ...m, content: "Having trouble connecting, sir. Try again.", streaming: false } : m
      ));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const statusColor: Record<string, string> = {
    done: "bg-green-900 text-green-200",
    "in-progress": "bg-blue-900 text-blue-200",
    todo: "bg-slate-700 text-slate-300",
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-4">

      {/* Top: Jarvis status */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-4xl font-bold text-white">Jarvis</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-sm text-green-400">Online — full capabilities</p>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* Left: Chat */}
        <Card className="flex-1 bg-slate-900 border-slate-700 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Quick actions on first load */}
            {messages.length === 1 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Things you can ask</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="text-left text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-2.5 transition-all">
                      <Zap size={11} className="inline mr-1.5 text-blue-400" />{s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-2.5 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center mt-1">
                      <Bot size={13} className="text-white" />
                    </div>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl ${
                    msg.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-slate-800 text-slate-100 rounded-bl-sm"
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.streaming && <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm" />}
                    <p className="text-xs mt-1 opacity-40">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                    <Bot size={13} className="text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-slate-800 flex items-center gap-1">
                    {[0, 150, 300].map((d) => (
                      <div key={d} className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-700 p-3 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Tell Jarvis what to do..."
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm"
                disabled={loading}
                autoFocus
              />
              <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0">
                <Send size={15} />
              </Button>
            </div>
          </div>
        </Card>

        {/* Right: Orb + status */}
        <div className="flex-shrink-0 w-44 flex flex-col gap-4">

          {/* Voice orb */}
          <Card className="bg-slate-900 border-slate-700 flex flex-col items-center justify-center py-6 px-3">
            <VoiceOrb onTranscript={sendMessage} isSpeaking={isSpeaking} />
          </Card>

          {/* Recent tasks */}
          <Card className="bg-slate-900 border-slate-700 flex-1 overflow-hidden flex flex-col">
            <div className="px-3 pt-3 pb-2 flex-shrink-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recent Tasks</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
              {recentTasks.length === 0 ? (
                <p className="text-xs text-slate-600 text-center pt-4">No tasks yet</p>
              ) : recentTasks.map((t) => (
                <div key={t.id} className="bg-slate-800 rounded-lg p-2">
                  <p className="text-xs text-white font-medium line-clamp-2 mb-1">{t.title}</p>
                  <div className="flex items-center gap-1">
                    {t.status === "in-progress" && <Loader2 size={9} className="animate-spin text-blue-400" />}
                    {t.status === "done" && <CheckCircle2 size={9} className="text-green-400" />}
                    <Badge className={`text-[10px] px-1 py-0 h-4 ${statusColor[t.status] || "bg-slate-700 text-slate-300"}`}>
                      {t.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}

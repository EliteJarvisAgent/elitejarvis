"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, Zap } from "lucide-react";
import { api } from "@/lib/backend-client";
import { VoiceOrb } from "@/components/VoiceOrb";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

const CAPABILITIES = [
  "Create a landing page for Elite Exteriors and deploy it",
  "Build a quote calculator for roofing jobs",
  "Write a marketing plan for Elite AI and research competitors",
  "Draft follow-up emails for my last 5 Jobber quotes",
  "Create an agent that monitors my Google reviews daily",
  "Research top home service companies in Louisville",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "At your service, sir. I have full capabilities here — I can build websites and deploy them, create agents, run code, do research, manage tasks, and more. What would you like done?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat history from Supabase
  useEffect(() => {
    api.fetchMessages().then((rows: any[]) => {
      if (!rows.length) return;
      const history: Message[] = rows.map((r) => ({
        id: r.id,
        role: r.sender === "matthew" ? "user" : "assistant",
        content: r.text,
        timestamp: new Date(r.timestamp),
      }));
      setMessages(history);
    }).catch(() => {});
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
    utt.onstart  = () => setIsSpeaking(true);
    utt.onend    = () => setIsSpeaking(false);
    utt.onerror  = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    const history = [...messages, userMsg].slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const replyId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: replyId, role: "assistant", content: "", timestamp: new Date(), streaming: true }]);

    try {
      const res = await fetch("/api/openclaw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              setMessages((prev) =>
                prev.map((m) => m.id === replyId ? { ...m, content: fullText } : m)
              );
            }
          } catch {}
        }
      }

      setMessages((prev) =>
        prev.map((m) => m.id === replyId ? { ...m, streaming: false } : m)
      );

      if (fullText) {
        speak(fullText);
        api.createMessage({ sender: "matthew", text }).catch(() => {});
        api.createMessage({ sender: "jarvis", text: fullText }).catch(() => {});
      }

    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === replyId
            ? { ...m, content: "I'm having trouble connecting right now, sir. Try again in a moment.", streaming: false }
            : m
        )
      );
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSend = () => sendMessage(input);
  const handleSuggestion = (s: string) => sendMessage(s);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-4xl font-bold text-white mb-1">Jarvis</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-sm text-green-400">Online — full capabilities</p>
          </div>
        </div>
      </div>

      {/* Main layout: chat + orb */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

        {/* Chat card */}
        <Card className="flex-1 bg-slate-900 border-slate-700 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Suggestions shown on first load */}
            {messages.length === 1 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Things you can ask Jarvis to do</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {CAPABILITIES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      className="text-left text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-4 py-3 transition-all"
                    >
                      <Zap size={12} className="inline mr-2 text-blue-400" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-3 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mt-1">
                      <Bot size={15} className="text-white" />
                    </div>
                  )}
                  <div className={`px-4 py-3 rounded-2xl ${
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-slate-800 text-slate-100 rounded-bl-sm"
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    {message.streaming && (
                      <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                    )}
                    <p className="text-xs mt-2 opacity-40">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <Bot size={15} className="text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-slate-800 flex items-center gap-1.5">
                    {[0, 150, 300].map((delay) => (
                      <div key={delay} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-700 p-4 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Tell Jarvis what to build, research, or do..."
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm"
                disabled={loading}
                autoFocus
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
              >
                <Send size={16} />
              </Button>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Connected to real openclaw — Jarvis can build, deploy, research, create agents, and more
            </p>
          </div>
        </Card>

        {/* Voice Orb panel */}
        <div className="flex-shrink-0 w-40 flex flex-col items-center justify-center">
          <VoiceOrb
            onTranscript={sendMessage}
            isSpeaking={isSpeaking}
          />
        </div>

      </div>
    </div>
  );
}

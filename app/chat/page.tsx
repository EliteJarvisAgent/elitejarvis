"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend-client";

interface Message {
  id: string;
  sender: "user" | "agent";
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load message history from Supabase on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const rows = await api.fetchMessages();
        if (rows.length > 0) {
          setMessages(
            rows.map((r: any) => ({
              id: r.id,
              sender: r.sender === "matthew" ? "user" : "agent",
              content: r.text,
              timestamp: new Date(r.timestamp),
            }))
          );
        } else {
          // First time — show greeting
          setMessages([
            {
              id: "welcome",
              sender: "agent",
              content: "Good to see you, sir. What do you need?",
              timestamp: new Date(),
            },
          ]);
        }
      } catch {
        setMessages([
          {
            id: "welcome",
            sender: "agent",
            content: "Good to see you, sir. What do you need?",
            timestamp: new Date(),
          },
        ]);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = (text: string) => {
    if (!ttsEnabled || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 0.88;
    const voices = window.speechSynthesis.getVoices();
    const preferred = [
      (v: SpeechSynthesisVoice) => v.name.includes("Daniel") && v.lang.startsWith("en"),
      (v: SpeechSynthesisVoice) => v.name.includes("Arthur"),
      (v: SpeechSynthesisVoice) => v.name.includes("Google UK English Male"),
      (v: SpeechSynthesisVoice) => v.lang === "en-GB",
      (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
    ];
    for (const fn of preferred) {
      const match = voices.find(fn);
      if (match) { utt.voice = match; break; }
    }
    window.speechSynthesis.speak(utt);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Save user message to Supabase
    try {
      await api.createMessage({ sender: "matthew", text: userText });
    } catch {}

    try {
      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const replyText: string = data.response || "No response.";

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "agent",
        content: replyText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, agentMsg]);
      speak(replyText);

      // Save Jarvis response to Supabase
      try {
        await api.createMessage({ sender: "jarvis", text: replyText });
      } catch {}
    } catch (err: any) {
      toast.error("Jarvis is unavailable right now.");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "agent",
          content: "I'm having trouble connecting right now, sir. Try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Chat</h1>
          <p className="text-slate-400">Talk to Jarvis directly</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTtsEnabled((v) => !v)}
          className={`mt-2 gap-2 ${ttsEnabled ? "text-green-400" : "text-slate-500"}`}
          title={ttsEnabled ? "Voice on — click to mute" : "Voice off — click to enable"}
        >
          {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          {ttsEnabled ? "Voice on" : "Voice off"}
        </Button>
      </div>

      <Card className="flex-1 bg-slate-900 border-slate-700 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex gap-3 max-w-xs lg:max-w-2xl ${
                  message.sender === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {message.sender === "agent" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div
                  className={`px-4 py-3 rounded-lg ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-800 text-slate-100 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-50">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="px-4 py-3 rounded-lg bg-slate-800 rounded-bl-none">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-700 p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Jarvis anything..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              disabled={loading}
              autoFocus
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send size={16} />
            </Button>
          </div>
          <p className="text-xs text-slate-600 mt-2">Enter to send · Voice toggle enables text-to-speech</p>
        </div>
      </Card>
    </div>
  );
}

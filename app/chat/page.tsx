"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: "user" | "agent";
  content: string;
  agent?: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "agent",
      agent: "Jarvis",
      content: "Hello! I'm ready to help. What can I do for you today?",
      timestamp: new Date(Date.now() - 5 * 60000),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "agent",
        agent: "Jarvis",
        content: `I received your message: "${userMessage.content}". Processing your request...`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="h-screen flex flex-col space-y-4">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Chat</h1>
        <p className="text-slate-400">Communicate with your AI agents in real-time</p>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 bg-slate-900 border-slate-700 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex gap-3 max-w-xs lg:max-w-md ${
                  message.sender === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {message.sender === "agent" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-800 text-slate-100 rounded-bl-none"
                  }`}
                >
                  {message.agent && (
                    <p className="text-xs font-semibold mb-1 opacity-75">{message.agent}</p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-50">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
                <div className="px-4 py-2 rounded-lg bg-slate-800 rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse delay-100" />
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse delay-200" />
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
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

import { useState, useCallback } from "react";
import { Send, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceOrb } from "./VoiceOrb";

interface Message {
  id: string;
  sender: "matthew" | "jarvis";
  text: string;
  timestamp: string;
  reasoning?: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    sender: "matthew",
    text: "Jarvis, check the status of the Q1 report and assign the review to Sarah.",
    timestamp: "10:32 AM",
  },
  {
    id: "2",
    sender: "jarvis",
    text: "Q1 report is 85% complete. I've assigned the final review to Sarah with a deadline of Friday 5 PM. She's been notified via Slack.",
    timestamp: "10:32 AM",
    reasoning: "Checked task DB → report status. Cross-referenced Sarah's capacity (2 slots free). Routed assignment + notification.",
  },
  {
    id: "3",
    sender: "matthew",
    text: "What's the bottleneck on the website redesign?",
    timestamp: "10:45 AM",
  },
  {
    id: "4",
    sender: "jarvis",
    text: "The design team is waiting on brand guidelines from marketing. I've pinged the marketing lead and set a 24-hour follow-up reminder.",
    timestamp: "10:45 AM",
    reasoning: "Traced dependency chain: redesign → brand assets → marketing approval. Identified 3-day delay. Auto-escalated.",
  },
];

export function ConversationFeed() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");

  const doSend = useCallback((text: string) => {
    if (!text.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "matthew",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "jarvis",
          text: "Acknowledged. Processing your request now. I'll update you shortly with results.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          reasoning: "Parsing intent → matching to available actions → executing pipeline.",
        },
      ]);
    }, 1200);
  }, []);

  const sendMessage = () => doSend(input);
  const handleVoiceTranscript = useCallback((text: string) => doSend(text), [doSend]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/50">
        <h2 className="font-mono text-xs uppercase tracking-widest text-primary">
          Live Feed
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.sender === "matthew" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.sender === "jarvis"
                    ? "bg-primary/20 border border-primary/30"
                    : "bg-secondary border border-border"
                }`}
              >
                {msg.sender === "jarvis" ? (
                  <Bot className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <User className="h-3.5 w-3.5 text-foreground" />
                )}
              </div>

              <div className={`max-w-[85%] space-y-1 ${msg.sender === "matthew" ? "items-end" : ""}`}>
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.sender === "jarvis"
                      ? "glass-panel"
                      : "bg-primary/10 border border-primary/20"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.reasoning && (
                  <div className="text-[11px] text-muted-foreground font-mono px-3 py-1 bg-muted/30 rounded border border-border/30">
                    <span className="text-primary/60">⚡</span> {msg.reasoning}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground font-mono px-1">
                  {msg.timestamp}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-3 border-t border-border/50">
        <div className="flex items-end gap-2">
          <VoiceOrb onTranscript={handleVoiceTranscript} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Command Jarvis..."
            className="flex-1 bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 font-mono"
          />
          <button
            onClick={sendMessage}
            className="h-9 w-9 rounded-lg bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-colors border border-primary/30"
          >
            <Send className="h-4 w-4 text-primary" />
          </button>
        </div>
      </div>
    </div>
  );
}

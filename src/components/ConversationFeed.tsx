import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
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
  const [isTyping, setIsTyping] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

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
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
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
    }, 1500);
  }, []);

  const sendMessage = () => doSend(input);
  const handleVoiceTranscript = useCallback((text: string) => doSend(text), [doSend]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-primary font-semibold">
              Live Feed
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {messages.length} messages
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-mono text-success/80">CONNECTED</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.sender === "matthew" ? 20 : -20, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`flex gap-3 ${msg.sender === "matthew" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === "jarvis"
                    ? "bg-primary/15 border border-primary/25 glow-primary"
                    : "bg-secondary border border-border/60"
                }`}
              >
                {msg.sender === "jarvis" ? (
                  <Bot className="h-4 w-4 text-primary" />
                ) : (
                  <User className="h-4 w-4 text-foreground/80" />
                )}
              </div>

              {/* Content */}
              <div className={`max-w-[80%] space-y-1.5 ${msg.sender === "matthew" ? "items-end" : ""}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.sender === "jarvis"
                      ? "glass-panel-elevated rounded-tl-md"
                      : "bg-primary/12 border border-primary/20 rounded-tr-md"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.reasoning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ delay: 0.15, duration: 0.2 }}
                    className="text-[11px] text-muted-foreground font-mono px-4 py-2 bg-muted/40 rounded-xl border border-border/30"
                  >
                    <span className="text-primary/60 mr-1">⚡</span>
                    {msg.reasoning}
                  </motion.div>
                )}
                <span className="text-[10px] text-muted-foreground/70 font-mono px-2 block">
                  {msg.timestamp}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex gap-3 items-center"
            >
              <div className="h-8 w-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="glass-panel-elevated rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground font-mono">Processing...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Command Input Footer */}
      <div className="px-5 py-4 border-t border-border/40 bg-card/40 backdrop-blur-sm">
        <div className="flex items-end gap-3">
          <VoiceOrb onTranscript={handleVoiceTranscript} />
          <div className="flex-1 relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Command Jarvis..."
              className="w-full bg-secondary/60 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 font-mono transition-all duration-200"
            />
          </div>
          <button
            onClick={sendMessage}
            className="h-11 w-11 rounded-xl bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-all duration-200 border border-primary/30 hover:glow-primary active:scale-95"
          >
            <Send className="h-4 w-4 text-primary" />
          </button>
        </div>
      </div>
    </div>
  );
}

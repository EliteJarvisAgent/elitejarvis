import { useState, useCallback, useRef, useEffect } from "react";
import { Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceOrb } from "./VoiceOrb";

interface Message {
  id: string;
  sender: "matthew" | "jarvis";
  text: string;
  timestamp: string;
}

export function ConversationFeed() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const doSend = useCallback((text: string) => {
    if (!text.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "matthew",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setIsSpeaking(true);

    setTimeout(() => {
      const response = "Acknowledged. Processing your request now. I'll update you shortly with results.";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "jarvis",
          text: response,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      // Speak via browser TTS
      if ("speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(response);
        utter.rate = 1;
        utter.pitch = 0.9;
        utter.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
      } else {
        setTimeout(() => setIsSpeaking(false), 2000);
      }
    }, 800);
  }, []);

  return (
    <div className="flex flex-col h-full items-center">
      {/* Scrollable transcript log */}
      <div ref={feedRef} className="w-full flex-1 overflow-y-auto px-6 pt-6 pb-2 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center gap-3 py-12"
            >
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="h-6 w-6 text-primary/50" />
              </div>
              <p className="text-muted-foreground/60 text-sm font-mono max-w-[240px]">
                Tap the orb below and speak a command to Jarvis
              </p>
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2 mb-3 ${msg.sender === "matthew" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.sender === "jarvis"
                    ? "glass-panel-elevated rounded-tl-md text-foreground"
                    : "bg-primary/12 border border-primary/20 rounded-tr-md text-foreground"
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>
                <span className="text-[9px] text-muted-foreground/50 font-mono mt-1 block text-right">
                  {msg.timestamp}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Voice Orb - centered at bottom */}
      <div className="py-8 flex flex-col items-center">
        <VoiceOrb onTranscript={doSend} isSpeaking={isSpeaking} />
      </div>
    </div>
  );
}

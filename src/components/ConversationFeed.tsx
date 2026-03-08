import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentNetwork } from "./AgentNetwork";

interface Message {
  id: string;
  sender: "matthew" | "jarvis";
  text: string;
  timestamp: string;
}

async function speakWithElevenLabs(
  text: string,
  onStart: () => void,
  onEnd: () => void
): Promise<void> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onplay = onStart;
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      onEnd();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      onEnd();
    };
    await audio.play();
  } catch (err) {
    console.warn("ElevenLabs TTS unavailable, using browser TTS:", err);
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 0.85;
      utter.volume = 1;
      // Try to pick a British English male voice for Jarvis feel
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith("en-GB") && v.name.toLowerCase().includes("male")
      ) || voices.find(
        (v) => v.lang.startsWith("en-GB")
      ) || voices.find(
        (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("daniel")
      ) || voices.find(
        (v) => v.lang.startsWith("en")
      );
      if (preferred) utter.voice = preferred;
      onStart();
      utter.onend = onEnd;
      utter.onerror = () => onEnd();
      window.speechSynthesis.speak(utter);
    } else {
      onStart();
      setTimeout(onEnd, 2000);
    }
  }
}

export function ConversationFeed() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
    setIsProcessing(true);

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

      speakWithElevenLabs(
        response,
        () => { setIsProcessing(false); setIsSpeaking(true); },
        () => setIsSpeaking(false)
      );
    }, 800);
  }, []);

  return (
    <div className="flex flex-col h-full items-center">
      {/* Transcript log */}
      <div
        ref={feedRef}
        className="w-full overflow-y-auto px-6 pt-4 pb-2 scrollbar-thin"
        style={{ maxHeight: "30%" }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2 mb-2 ${msg.sender === "matthew" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  msg.sender === "jarvis"
                    ? "glass-panel-elevated rounded-tl-md text-foreground"
                    : "bg-primary/12 border border-primary/20 rounded-tr-md text-foreground"
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>
                <span className="text-[9px] text-muted-foreground/50 font-mono-display mt-1 block text-right">
                  {msg.timestamp}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Agent Network with central orb */}
      <div className="flex-1 flex items-center justify-center">
        <AgentNetwork onTranscript={doSend} isSpeaking={isSpeaking} isProcessing={isProcessing} />
      </div>
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentNetwork } from "./AgentNetwork";

interface Message {
  id: string;
  sender: "matthew" | "jarvis";
  text: string;
  timestamp: string;
}

type ChatMsg = { role: "user" | "assistant"; content: string };

async function askJarvis(history: ChatMsg[]): Promise<string> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jarvis-chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: history }),
    }
  );

  if (!response.ok) {
    throw new Error(`Jarvis chat failed: ${response.status}`);
  }

  const data = await response.json();
  return data.reply || "Apologies sir, I'm having difficulty processing that.";
}

async function speakWithElevenLabs(
  text: string,
  onStart: () => void,
  onEnd: () => void,
  audioRef?: React.MutableRefObject<HTMLAudioElement | null>
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
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 0.85;
      utter.volume = 1;
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
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleInterrupt = useCallback(() => {
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    // Stop browser speech synthesis
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsProcessing(false);
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const doSend = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "matthew",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setIsProcessing(true);

    const newHistory: ChatMsg[] = [...chatHistory, { role: "user", content: text }];
    setChatHistory(newHistory);

    try {
      const reply = await askJarvis(newHistory);

      setChatHistory((prev) => [...prev, { role: "assistant", content: reply }]);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "jarvis",
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      speakWithElevenLabs(
        reply,
        () => { setIsProcessing(false); setIsSpeaking(true); },
        () => setIsSpeaking(false)
      );
    } catch (err) {
      console.error("Jarvis error:", err);
      setIsProcessing(false);
      const fallback = "Apologies sir, I'm experiencing a temporary disruption. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "jarvis",
          text: fallback,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [chatHistory]);

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

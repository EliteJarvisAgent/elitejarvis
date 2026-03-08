import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentNetwork } from "./AgentNetwork";
import { useMessages } from "@/hooks/use-messages";

type ChatMsg = { role: "user" | "assistant"; content: string };

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "blpkggmfpxrjvcoclssq";
const CLOUD_BASE_URL = `https://${PROJECT_ID}.supabase.co`;
const CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

async function askJarvis(history: ChatMsg[]): Promise<string> {
  const response = await fetch(`${CLOUD_BASE_URL}/functions/v1/jarvis-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CLOUD_KEY,
      Authorization: `Bearer ${CLOUD_KEY}`,
    },
    body: JSON.stringify({ messages: history }),
  });

  if (!response.ok) throw new Error(`Jarvis chat failed: ${response.status}`);
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
    const response = await fetch(`${CLOUD_BASE_URL}/functions/v1/elevenlabs-tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CLOUD_KEY,
        Authorization: `Bearer ${CLOUD_KEY}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) throw new Error(`TTS failed: ${response.status}`);
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    if (audioRef) audioRef.current = audio;

    audio.onplay = onStart;
    audio.onended = () => { URL.revokeObjectURL(audioUrl); if (audioRef) audioRef.current = null; onEnd(); };
    audio.onerror = () => { URL.revokeObjectURL(audioUrl); if (audioRef) audioRef.current = null; onEnd(); };
    await audio.play();
  } catch (err) {
    console.warn("ElevenLabs TTS unavailable, using browser TTS:", err);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95; utter.pitch = 0.85; utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith("en-GB") && /male|daniel|george|james/i.test(v.name))
        || voices.find(v => v.lang.startsWith("en") && /male|daniel|george|james|david|mark|alex/i.test(v.name))
        || voices.find(v => v.lang.startsWith("en-GB") && !/female|woman|girl|zira|hazel|susan|kate|fiona|moira|samantha|karen|tessa/i.test(v.name))
        || voices.find(v => v.lang.startsWith("en") && !/female|woman|girl|zira|hazel|susan|kate|fiona|moira|samantha|karen|tessa/i.test(v.name))
        || voices[0];
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
  const { messages, chatHistory, addMessage } = useMessages();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleInterrupt = useCallback(() => {
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsProcessing(false);
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  const doSend = useCallback(async (text: string) => {
    if (!text.trim()) return;
    handleInterrupt();

    // Never block the voice flow on DB errors
    try {
      await addMessage("matthew", text);
    } catch (error) {
      console.warn("User message save failed:", error);
    }

    setIsProcessing(true);
    const newHistory: ChatMsg[] = [...chatHistory, { role: "user", content: text }];

    try {
      const reply = await askJarvis(newHistory);

      try {
        await addMessage("jarvis", reply);
      } catch (error) {
        console.warn("Jarvis message save failed:", error);
      }

      speakWithElevenLabs(
        reply,
        () => { setIsProcessing(false); setIsSpeaking(true); },
        () => setIsSpeaking(false),
        currentAudioRef
      );
    } catch (err) {
      console.error("Jarvis error:", err);
      setIsProcessing(false);
      try {
        await addMessage("jarvis", "Apologies sir, I'm experiencing a temporary disruption. Please try again.");
      } catch {
        // no-op: local fallback handled in hook
      }
    }
  }, [chatHistory, handleInterrupt, addMessage]);

  return (
    <div className="flex flex-col h-full items-center">
      <div
        ref={feedRef}
        className="w-full overflow-y-auto px-3 sm:px-6 pt-4 pb-2 scrollbar-thin"
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
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3 sm:px-4 py-2 text-sm ${
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

      <div className="flex-1 flex items-center justify-center w-full px-4">
        <AgentNetwork onTranscript={doSend} isSpeaking={isSpeaking} isProcessing={isProcessing} onInterrupt={handleInterrupt} />
      </div>
    </div>
  );
}

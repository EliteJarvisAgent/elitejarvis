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
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
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
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;

    audio.pause();
    audio.src = audioUrl;
    audio.preload = "auto";

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
      utter.rate = 0.92;
      utter.pitch = 0.8;
      utter.volume = 1;

      // Wait for voices to load (some browsers load async)
      const getVoices = (): Promise<SpeechSynthesisVoice[]> =>
        new Promise((resolve) => {
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) return resolve(voices);
          window.speechSynthesis.onvoiceschanged = () =>
            resolve(window.speechSynthesis.getVoices());
          setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
        });

      const voices = await getVoices();
      const femalePattern = /female|woman|girl|zira|hazel|susan|kate|fiona|moira|samantha|karen|tessa|victoria|alice|sarah|jessica|lily|matilda|siri.*female/i;

      // Priority 1: Exact British male voices by name
      const preferred =
        voices.find((v) => /george/i.test(v.name) && v.lang.startsWith("en-GB")) ||
        voices.find((v) => /daniel/i.test(v.name) && v.lang.startsWith("en-GB")) ||
        voices.find((v) => /james/i.test(v.name) && v.lang.startsWith("en-GB")) ||
        voices.find((v) => /google uk english male/i.test(v.name)) ||
        // Priority 2: Any en-GB voice that's not female
        voices.find((v) => v.lang.startsWith("en-GB") && !femalePattern.test(v.name)) ||
        // Priority 3: Any English male-sounding voice
        voices.find((v) => v.lang.startsWith("en") && /male|david|mark|alex|tom|oliver|arthur/i.test(v.name) && !femalePattern.test(v.name)) ||
        // Priority 4: Any English voice that's not female
        voices.find((v) => v.lang.startsWith("en") && !femalePattern.test(v.name)) ||
        voices[0];

      if (preferred) {
        console.log("Jarvis fallback voice:", preferred.name, preferred.lang);
        utter.voice = preferred;
      }
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
  const [voiceNotice, setVoiceNotice] = useState<string>("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [manualText, setManualText] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleInterrupt = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsProcessing(false);
  }, []);

  const primeAudioPlayback = useCallback(() => {
    const audio = currentAudioRef.current ?? new Audio();
    currentAudioRef.current = audio;
    audio.muted = true;
    const maybePromise = audio.play();
    if (maybePromise?.catch) {
      maybePromise.catch(() => undefined).finally(() => {
        audio.pause();
        audio.muted = false;
      });
    }
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, isProcessing]);

  const doSend = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setVoiceNotice("");
      handleInterrupt();

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

        await speakWithElevenLabs(
          reply,
          () => {
            setIsProcessing(false);
            setIsSpeaking(true);
          },
          () => setIsSpeaking(false),
          currentAudioRef
        );
      } catch (err) {
        console.error("Jarvis error:", err);
        setIsProcessing(false);
        try {
          await addMessage("jarvis", "Apologies sir, I'm experiencing a temporary disruption. Please try again.");
        } catch {
          // no-op
        }
      }
    },
    [chatHistory, handleInterrupt, addMessage]
  );

  const sendManualText = useCallback(() => {
    if (!manualText.trim()) return;
    doSend(manualText);
    setManualText("");
  }, [doSend, manualText]);

  return (
    <div className="flex flex-col h-full items-center">
      <div className="flex-1 flex items-center justify-center w-full px-4">
        <AgentNetwork
          onTranscript={doSend}
          isSpeaking={isSpeaking}
          isProcessing={isProcessing}
          onInterrupt={handleInterrupt}
          onUserInteraction={primeAudioPlayback}
          onVoiceUnavailable={setVoiceNotice}
          onTranscriptPreview={setLiveTranscript}
          onListeningChange={setIsListening}
        />
      </div>

      {voiceNotice && (
        <div className="w-full px-3 pb-2">
          <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            {voiceNotice}
          </div>
        </div>
      )}

      <div
        ref={feedRef}
        className="w-full overflow-y-auto px-3 sm:px-6 pt-2 pb-2 scrollbar-thin"
        style={{ maxHeight: "40%", minHeight: messages.length > 0 || isProcessing || isListening || !!liveTranscript ? "80px" : "56px" }}
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

        {isListening && (
          <div className="mb-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs text-muted-foreground">
            <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
            Listening… {liveTranscript || "speak now"}
          </div>
        )}

        {!isListening && !isProcessing && messages.length === 0 && (
          <div className="mb-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs text-muted-foreground">
            Transcript appears here after you speak.
          </div>
        )}

        {isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-2">
            <div className="glass-panel-elevated rounded-2xl rounded-tl-md px-4 py-2 text-sm text-muted-foreground">
              <span className="animate-pulse">Jarvis is thinking…</span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="w-full px-3 sm:px-6 pb-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-2">
          <input
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendManualText();
            }}
            placeholder="Type to chat if voice is unavailable"
            className="flex-1 bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={sendManualText}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

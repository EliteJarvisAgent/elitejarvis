import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { AgentNetwork } from "./AgentNetwork";
import { useMessages } from "@/hooks/use-messages";

type ChatMsg = { role: "user" | "assistant"; content: string };

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "blpkggmfpxrjvcoclssq";
const CLOUD_URL = `https://${PROJECT_ID}.supabase.co`;
const CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const JARVIS_CHAT_URL = `${CLOUD_URL}/functions/v1/jarvis-chat`;
const WEBHOOK_URL = "https://lovable-jarvis-bridge.vercel.app/api/jarvis";

async function cleanTranscript(rawText: string): Promise<string> {
  try {
    const res = await fetch(`${CLOUD_URL}/functions/v1/clean-transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CLOUD_KEY, Authorization: `Bearer ${CLOUD_KEY}` },
      body: JSON.stringify({ text: rawText }),
    });
    if (!res.ok) return rawText;
    const data = await res.json();
    return data.cleaned || rawText;
  } catch {
    return rawText;
  }
}

// Simulate typewriter for non-streaming responses
async function simulateTypewriter(text: string, onChunk: (fullText: string) => void): Promise<void> {
  const words = text.split(/(\s+)/);
  let accumulated = "";
  for (const word of words) {
    accumulated += word;
    onChunk(accumulated);
    if (word.trim()) {
      await new Promise((r) => setTimeout(r, 18));
    }
  }
}

// ---------- Streaming Jarvis API ----------

async function askJarvisStream(
  message: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  // Primary: use jarvis-chat edge function with real SSE streaming
  try {
    const res = await fetch(JARVIS_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CLOUD_KEY,
        Authorization: `Bearer ${CLOUD_KEY}`,
      },
      body: JSON.stringify({ message, stream: true }),
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get("content-type") || "";
    // Real SSE stream from edge function
    if (contentType.includes("text/event-stream") && res.body) {
      return await readSSEStream(res.body, onChunk);
    }

    // Fallback: JSON response (non-streaming)
    const data = await res.json();
    const reply = data.reply || data.response || data.message || "";
    if (reply) {
      await simulateTypewriter(reply, onChunk);
      return reply;
    }
    throw new Error("Empty response from jarvis-chat");
  } catch (err) {
    console.warn("jarvis-chat failed, trying bridge API:", err);
    // Fallback: try bridge API directly
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, stream: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && res.body) {
        return await readSSEStream(res.body, onChunk);
      }

      const data = await res.json();
      const reply = data.response || data.reply || data.message || "";
      if (reply) {
        await simulateTypewriter(reply, onChunk);
        return reply;
      }
      throw new Error("Empty bridge response");
    } catch (fallbackErr) {
      console.error("All Jarvis endpoints failed:", fallbackErr);
      const errMsg = "Apologies sir, I'm having difficulty processing that.";
      onChunk(errMsg);
      return errMsg;
    }
  }
}

async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (fullText: string) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split("\n");
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue; // skip empty lines and comments

        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            // Handle OpenAI-style delta format
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              onChunk(accumulated);
            }
            // Handle simple { text: "..." } or { content: "..." } formats
            else if (parsed.text) {
              accumulated += parsed.text;
              onChunk(accumulated);
            } else if (parsed.content) {
              accumulated += parsed.content;
              onChunk(accumulated);
            }
            // Handle { response: "full text" } (non-delta)
            else if (parsed.response) {
              accumulated = parsed.response;
              onChunk(accumulated);
            }
          } catch {
            // Not valid JSON — might be raw text
            accumulated += jsonStr;
            onChunk(accumulated);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated || "Apologies sir, I received an empty response.";
}

// ---------- TTS ----------

async function speakWithTTS(
  text: string,
  onStart: () => void,
  onEnd: () => void,
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
): Promise<void> {
  try {
    const ttsRes = await fetch(`${CLOUD_URL}/functions/v1/elevenlabs-tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CLOUD_KEY, Authorization: `Bearer ${CLOUD_KEY}` },
      body: JSON.stringify({ text }),
    });
    if (!ttsRes.ok) throw new Error(`TTS failed: ${ttsRes.status}`);

    const audioBlob = await ttsRes.blob();
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
      const preferred =
        voices.find((v) => /george/i.test(v.name) && v.lang.startsWith("en-GB")) ||
        voices.find((v) => /daniel/i.test(v.name) && v.lang.startsWith("en-GB")) ||
        voices.find((v) => v.lang.startsWith("en-GB") && !femalePattern.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("en") && !femalePattern.test(v.name)) ||
        voices[0];

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

// ---------- Main Component ----------

export function ConversationFeed() {
  const { messages, chatHistory, addMessage } = useMessages();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string>("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [manualText, setManualText] = useState("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInterrupt = useCallback(() => {
    // Abort any in-flight SSE stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsProcessing(false);
    // Save whatever was streamed so far before clearing
    if (streamingText && streamingText.length > 0) {
      addMessage("jarvis", streamingText).catch(() => {});
    }
    setStreamingText(null);
  }, [streamingText, addMessage]);

  const primeAudioPlayback = useCallback(() => {
    if (audioUnlockedRef.current) return;

    const audio = currentAudioRef.current ?? new Audio();
    currentAudioRef.current = audio;
    audio.preload = "auto";
    audio.muted = true;
    audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

    const unlockPromise = audio.play();
    if (unlockPromise?.then) {
      unlockPromise
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          audioUnlockedRef.current = true;
        })
        .catch(() => {
          audio.muted = false;
        });
    } else {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audioUnlockedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, isProcessing, streamingText]);

  const doSend = useCallback(
    async (rawText: string) => {
      if (!rawText.trim()) return;
      setVoiceNotice("");
      handleInterrupt();

      const text = await cleanTranscript(rawText);

      try {
        await addMessage("matthew", text);
      } catch (error) {
        console.warn("User message save failed:", error);
      }

      setIsProcessing(true);
      setStreamingText("");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const finalReply = await askJarvisStream(text, (partialText) => {
          setStreamingText(partialText);
        }, controller.signal);

        // Streaming complete — clear streaming state and persist final message
        setStreamingText(null);

        try {
          await addMessage("jarvis", finalReply);
        } catch (error) {
          console.warn("Jarvis message save failed:", error);
        }

        // Play TTS with the complete reply
        await speakWithTTS(
          finalReply,
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
        setStreamingText(null);
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
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Orb — positioned at top */}
      <div className="flex-shrink-0 flex items-start justify-center pt-4 sm:pt-8 px-4">
        <div className="w-full max-w-[500px]">
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
      </div>


      {voiceNotice && (
        <div className="w-full px-3 pb-2 relative z-10">
          <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            {voiceNotice}
          </div>
        </div>
      )}

      {/* Transcript — scrolls independently */}
      <div
        ref={feedRef}
        className="flex-1 min-h-0 w-full overflow-y-auto px-3 sm:px-6 pt-2 pb-2 scrollbar-thin"
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
                className={`min-w-0 max-w-[90%] sm:max-w-[85%] overflow-visible rounded-2xl px-3 sm:px-4 py-2 text-sm ${
                  msg.sender === "jarvis"
                    ? "glass-panel-elevated rounded-tl-md text-foreground"
                    : "bg-primary/12 border border-primary/20 rounded-tr-md text-foreground"
                }`}
              >
                <div className="leading-relaxed max-w-none whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  <ReactMarkdown>{msg.text ?? ""}</ReactMarkdown>
                </div>
                <span className="text-[9px] text-muted-foreground/50 font-mono-display mt-1 block text-right">
                  {msg.timestamp}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming message bubble */}
        {streamingText !== null && streamingText.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-2 mb-2 justify-start"
          >
            <div className="min-w-0 max-w-[90%] sm:max-w-[85%] overflow-visible rounded-2xl rounded-tl-md px-3 sm:px-4 py-2 text-sm glass-panel-elevated text-foreground">
              <div className="leading-relaxed max-w-none whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                <ReactMarkdown>{streamingText}</ReactMarkdown>
                <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
              </div>
            </div>
          </motion.div>
        )}

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

        {isProcessing && streamingText !== null && streamingText.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-2">
            <div className="glass-panel-elevated rounded-2xl rounded-tl-md px-4 py-2 text-sm text-muted-foreground">
              <span className="animate-pulse">Jarvis is thinking…</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Text input — always at very bottom */}
      <div className="flex-shrink-0 w-full px-3 sm:px-6 pb-3">
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

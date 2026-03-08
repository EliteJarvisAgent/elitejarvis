import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceOrbProps {
  onTranscript: (text: string) => void;
}

export function VoiceOrb({ onTranscript }: VoiceOrbProps) {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const stopAnalyser = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    setVolume(0);
  }, []);

  const startAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolume(Math.min(avg / 80, 1));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // mic denied
    }
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      setInterim(interimText);
      if (finalText) {
        onTranscript(finalText.trim());
        setInterim("");
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      stopAnalyser();
    };

    recognition.onend = () => {
      setIsListening(false);
      stopAnalyser();
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    startAnalyser();
  }, [onTranscript, startAnalyser, stopAnalyser]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterim("");
    stopAnalyser();
  }, [stopAnalyser]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopAnalyser();
    };
  }, [stopAnalyser]);

  const ringCount = 3;

  return (
    <div className="flex flex-col items-center gap-3">
      <AnimatePresence>
        {isListening && interim && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xs font-mono text-muted-foreground px-3 py-1.5 rounded-lg glass-panel max-w-[200px] text-center truncate"
          >
            {interim}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={isListening ? stopListening : startListening}
        className="relative h-12 w-12 rounded-full flex items-center justify-center focus:outline-none"
      >
        {/* Animated rings */}
        <AnimatePresence>
          {isListening &&
            Array.from({ length: ringCount }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border border-primary/40"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{
                  scale: 1 + volume * 1.2 + i * 0.3,
                  opacity: Math.max(0, 0.5 - i * 0.15 - volume * 0.1),
                }}
                exit={{ scale: 1, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              />
            ))}
        </AnimatePresence>

        {/* Core orb */}
        <motion.div
          className={`relative z-10 h-10 w-10 rounded-full flex items-center justify-center border transition-colors ${
            isListening
              ? "bg-primary/30 border-primary/60 glow-primary"
              : "bg-primary/10 border-primary/20 hover:bg-primary/20"
          }`}
          animate={
            isListening
              ? { scale: 1 + volume * 0.2 }
              : { scale: 1 }
          }
          transition={{ duration: 0.1 }}
        >
          {isListening ? (
            <MicOff className="h-4 w-4 text-primary" />
          ) : (
            <Mic className="h-4 w-4 text-primary" />
          )}
        </motion.div>

        {/* Glow effect */}
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/10 blur-xl"
            animate={{ opacity: 0.3 + volume * 0.7, scale: 1.5 + volume }}
            transition={{ duration: 0.1 }}
          />
        )}
      </button>

      {isListening && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] font-mono text-primary/70 uppercase tracking-widest"
        >
          Listening…
        </motion.span>
      )}
    </div>
  );
}

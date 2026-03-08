import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceOrbProps {
  onTranscript: (text: string) => void;
  isSpeaking?: boolean;
}

export function VoiceOrb({ onTranscript, isSpeaking = false }: VoiceOrbProps) {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [interim, setInterim] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Simulated jarvis volume for visual effect
  const [jarvisVolume, setJarvisVolume] = useState(0);
  useEffect(() => {
    if (!isSpeaking) { setJarvisVolume(0); return; }
    const interval = setInterval(() => {
      setJarvisVolume(0.3 + Math.random() * 0.7);
    }, 80);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const activeVolume = isListening ? volume : isSpeaking ? jarvisVolume : 0;
  const isActive = isListening || isSpeaking;

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
    if (isSpeaking) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
  }, [onTranscript, startAnalyser, stopAnalyser, isSpeaking]);

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

  const ringCount = 4;
  const orbSize = 160;

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      {/* Status label */}
      <AnimatePresence mode="wait">
        <motion.span
          key={isListening ? "listening" : isSpeaking ? "speaking" : "idle"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground"
        >
          {isListening ? "Listening..." : isSpeaking ? "Jarvis speaking..." : "Tap to speak"}
        </motion.span>
      </AnimatePresence>

      {/* Interim transcript */}
      <AnimatePresence>
        {isListening && interim && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm font-mono text-foreground/80 px-5 py-2.5 rounded-2xl glass-panel-elevated max-w-[320px] text-center"
          >
            {interim}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Orb */}
      <button
        onClick={isListening ? stopListening : startListening}
        className="relative flex items-center justify-center focus:outline-none"
        style={{ width: orbSize, height: orbSize }}
      >
        {/* Outer rings */}
        {Array.from({ length: ringCount }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: orbSize,
              height: orbSize,
              border: `1px solid`,
              borderColor: isActive
                ? isListening
                  ? `hsl(185 90% 48% / ${0.15 - i * 0.03})`
                  : `hsl(160 70% 45% / ${0.15 - i * 0.03})`
                : `hsl(222 18% 16% / ${0.3 - i * 0.05})`,
            }}
            animate={{
              scale: isActive ? 1 + activeVolume * 0.6 + i * 0.18 : 1 + i * 0.08,
              opacity: isActive ? Math.max(0, 0.6 - i * 0.12) : 0.15 - i * 0.03,
            }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          />
        ))}

        {/* Ambient glow */}
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{ width: orbSize * 1.5, height: orbSize * 1.5 }}
          animate={{
            opacity: isActive ? 0.15 + activeVolume * 0.3 : 0.05,
            scale: isActive ? 1 + activeVolume * 0.3 : 1,
            background: isListening
              ? "radial-gradient(circle, hsl(185 90% 48% / 0.4), transparent)"
              : isSpeaking
              ? "radial-gradient(circle, hsl(160 70% 45% / 0.4), transparent)"
              : "radial-gradient(circle, hsl(185 90% 48% / 0.15), transparent)",
          }}
          transition={{ duration: 0.1 }}
        />

        {/* Inner glow ring */}
        <motion.div
          className="absolute rounded-full"
          style={{ width: orbSize * 0.85, height: orbSize * 0.85 }}
          animate={{
            boxShadow: isActive
              ? isListening
                ? `0 0 ${30 + activeVolume * 40}px ${8 + activeVolume * 15}px hsl(185 90% 48% / ${0.1 + activeVolume * 0.15})`
                : `0 0 ${30 + activeVolume * 40}px ${8 + activeVolume * 15}px hsl(160 70% 45% / ${0.1 + activeVolume * 0.15})`
              : "0 0 15px 4px hsl(185 90% 48% / 0.05)",
          }}
          transition={{ duration: 0.1 }}
        />

        {/* Core sphere */}
        <motion.div
          className="relative z-10 rounded-full flex items-center justify-center overflow-hidden"
          style={{
            width: orbSize * 0.55,
            height: orbSize * 0.55,
          }}
          animate={{
            scale: isActive ? 1 + activeVolume * 0.15 : 1,
            background: isListening
              ? "radial-gradient(circle at 40% 35%, hsl(185 90% 60%), hsl(185 90% 35%))"
              : isSpeaking
              ? "radial-gradient(circle at 40% 35%, hsl(160 70% 55%), hsl(160 70% 30%))"
              : "radial-gradient(circle at 40% 35%, hsl(185 90% 48% / 0.25), hsl(185 90% 48% / 0.08))",
          }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        >
          {/* Inner highlight */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              background: isActive
                ? "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.2), transparent 60%)"
                : "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.06), transparent 60%)",
            }}
          />

          {/* Icon */}
          <motion.div
            animate={{ scale: isActive ? 1 + activeVolume * 0.1 : 1 }}
            transition={{ duration: 0.1 }}
          >
            {isListening ? (
              <MicOff className="h-7 w-7 text-primary-foreground drop-shadow-lg" />
            ) : (
              <Mic className={`h-7 w-7 ${isActive ? "text-accent-foreground" : "text-primary/60"} drop-shadow-lg`} />
            )}
          </motion.div>
        </motion.div>
      </button>
    </div>
  );
}

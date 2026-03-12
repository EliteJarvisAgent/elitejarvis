import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

interface VoiceOrbProps {
  onTranscript: (text: string) => void;
  isSpeaking?: boolean;
  onInterrupt?: () => void;
  onUserInteraction?: () => void;
  onVoiceUnavailable?: (reason: string) => void;
  onTranscriptPreview?: (text: string) => void;
  onListeningChange?: (isListening: boolean) => void;
}

export function VoiceOrb({
  onTranscript,
  isSpeaking = false,
  onInterrupt,
  onUserInteraction,
  onVoiceUnavailable,
  onTranscriptPreview,
  onListeningChange,
}: VoiceOrbProps) {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingTranscriptRef = useRef("");
  const emittedThisSessionRef = useRef(false);

  const [jarvisVolume, setJarvisVolume] = useState(0);
  const wasSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRestartRef = useRef(false);
  const manualStopRef = useRef(false);

  useEffect(() => {
    if (!isSpeaking) {
      setJarvisVolume(0);
      return;
    }
    const interval = setInterval(() => {
      setJarvisVolume(0.3 + Math.random() * 0.7);
    }, 80);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const activeVolume = isListening ? volume : isSpeaking ? jarvisVolume : 0;
  const isActive = isListening || isSpeaking;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopAnalyser = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    setVolume(0);
  }, []);

  const emitTranscript = useCallback(
    (value: string) => {
      const cleaned = value.trim();
      if (!cleaned || emittedThisSessionRef.current) return;
      emittedThisSessionRef.current = true;
      onTranscript(cleaned);
    },
    [onTranscript]
  );

  const startAnalyserFromStream = useCallback((stream: MediaStream) => {
    try {
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
      onVoiceUnavailable?.("Microphone visualization unavailable.");
    }
  }, [onVoiceUnavailable]);

  const startListening = useCallback(async () => {
    if (isSpeaking && onInterrupt) onInterrupt();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      onVoiceUnavailable?.("Voice recognition isn't supported on this browser.");
      onListeningChange?.(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      startAnalyserFromStream(stream);
    } catch {
      onVoiceUnavailable?.("Microphone permission denied.");
      onListeningChange?.(false);
      return;
    }

    pendingTranscriptRef.current = "";
    emittedThisSessionRef.current = false;
    onTranscriptPreview?.("");

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // Start 10-second silence timeout — resets on any speech result
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      recognition.stop();
    }, 10000);

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      // Reset silence timer on any speech
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        recognition.stop();
      }, 10000);

      let finalText = "";
      let interimText = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += `${t} `;
        } else {
          interimText += `${t} `;
        }
      }

      const finalChunk = finalText.trim();
      const interimChunk = interimText.trim();
      pendingTranscriptRef.current = finalChunk || interimChunk || pendingTranscriptRef.current;
      onTranscriptPreview?.(pendingTranscriptRef.current);

      if (finalChunk) emitTranscript(finalChunk);
    };

    recognition.onerror = (event: Event) => {
      clearSilenceTimer();
      const errorEvent = event as Event & { error?: string };
      const reason = errorEvent.error
        ? `Voice recognition failed (${errorEvent.error}).`
        : "Voice recognition failed. Please try again.";
      onVoiceUnavailable?.(reason);
      setIsListening(false);
      onListeningChange?.(false);
      stopAnalyser();
    };

    recognition.onend = () => {
      clearSilenceTimer();
      if (!emittedThisSessionRef.current && pendingTranscriptRef.current.trim()) {
        emitTranscript(pendingTranscriptRef.current);
      }
      onTranscriptPreview?.("");
      pendingTranscriptRef.current = "";
      setIsListening(false);
      onListeningChange?.(false);
      stopAnalyser();
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    onListeningChange?.(true);
  }, [
    clearSilenceTimer,
    emitTranscript,
    isSpeaking,
    onInterrupt,
    onListeningChange,
    onTranscriptPreview,
    onVoiceUnavailable,
    startAnalyserFromStream,
    stopAnalyser,
  ]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    manualStopRef.current = true;
    autoRestartRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    onListeningChange?.(false);
    onTranscriptPreview?.("");
    stopAnalyser();
  }, [clearSilenceTimer, onListeningChange, onTranscriptPreview, stopAnalyser]);

  // Auto-restart listening after Jarvis finishes speaking
  useEffect(() => {
    if (wasSpeakingRef.current && !isSpeaking) {
      // Only auto-restart if user didn't manually stop
      if (!manualStopRef.current) {
        autoRestartRef.current = true;
        const t = setTimeout(() => {
          if (autoRestartRef.current) {
            startListening();
          }
        }, 400);
        return () => clearTimeout(t);
      }
    }
    if (isSpeaking) {
      manualStopRef.current = false;
    }
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking, startListening]);

  const handleOrbClick = useCallback(() => {
    onUserInteraction?.();
    if (isSpeaking && onInterrupt) {
      onInterrupt();
      return;
    }
    if (isListening) {
      stopListening();
      return;
    }
    manualStopRef.current = false;
    startListening();
  }, [isListening, isSpeaking, onInterrupt, onUserInteraction, startListening, stopListening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopAnalyser();
    };
  }, [stopAnalyser]);

  const orbSize = 160;
  const ringCount = 5;

  return (
    <button
      onClick={handleOrbClick}
      className="relative flex items-center justify-center focus:outline-none cursor-pointer"
      style={{ width: orbSize, height: orbSize }}
    >
      {Array.from({ length: ringCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: orbSize, height: orbSize }}
          animate={{
            scale: isActive ? 1 + activeVolume * 0.5 + i * 0.22 : 1 + i * 0.1,
            opacity: isActive ? Math.max(0, 0.5 - i * 0.1) : 0.08 - i * 0.015,
            borderWidth: 1,
            borderColor: isListening
              ? `hsl(185, 90%, 48%, ${0.3 - i * 0.05})`
              : isSpeaking
                ? `hsl(160, 70%, 50%, ${0.3 - i * 0.05})`
                : `hsl(185, 90%, 48%, ${0.08 - i * 0.015})`,
            borderStyle: "solid",
          }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        />
      ))}

      <motion.div
        className="absolute rounded-full"
        style={{ width: orbSize * 2, height: orbSize * 2 }}
        animate={{
          opacity: isActive ? 0.2 + activeVolume * 0.25 : 0.05,
          scale: isActive ? 1 + activeVolume * 0.15 : 1,
          background: isListening
            ? "radial-gradient(circle, hsl(185, 90%, 48%, 0.35), hsl(185, 90%, 48%, 0.05) 60%, transparent 80%)"
            : isSpeaking
              ? "radial-gradient(circle, hsl(160, 70%, 50%, 0.35), hsl(160, 70%, 50%, 0.05) 60%, transparent 80%)"
              : "radial-gradient(circle, hsl(185, 90%, 48%, 0.1), transparent 70%)",
        }}
        transition={{ duration: 0.12 }}
      />

      <motion.div
        className="absolute rounded-full blur-xl"
        style={{ width: orbSize * 0.9, height: orbSize * 0.9 }}
        animate={{
          background: isListening
            ? `hsl(185, 90%, 50%, ${0.15 + activeVolume * 0.25})`
            : isSpeaking
              ? `hsl(160, 70%, 50%, ${0.15 + activeVolume * 0.25})`
              : "hsl(185, 90%, 48%, 0.05)",
          scale: isActive ? 1 + activeVolume * 0.2 : 1,
        }}
        transition={{ duration: 0.1 }}
      />

      <motion.div
        className="relative z-10 rounded-full overflow-hidden"
        style={{ width: orbSize * 0.45, height: orbSize * 0.45 }}
        animate={{
          scale: isActive ? 1 + activeVolume * 0.2 : 1,
          background: isListening
            ? "radial-gradient(circle at 35% 30%, hsl(185, 90%, 70%), hsl(185, 90%, 35%), hsl(200, 80%, 20%))"
            : isSpeaking
              ? "radial-gradient(circle at 35% 30%, hsl(160, 80%, 65%), hsl(160, 70%, 30%), hsl(170, 60%, 15%))"
              : "radial-gradient(circle at 35% 30%, hsl(185, 90%, 48%, 0.3), hsl(185, 90%, 48%, 0.08), transparent)",
          boxShadow: isActive
            ? isListening
              ? `0 0 ${20 + activeVolume * 30}px ${6 + activeVolume * 12}px hsl(185, 90%, 48%, ${0.15 + activeVolume * 0.2})`
              : `0 0 ${20 + activeVolume * 30}px ${6 + activeVolume * 12}px hsl(160, 70%, 45%, ${0.15 + activeVolume * 0.2})`
            : "0 0 12px 3px hsl(185, 90%, 48%, 0.06)",
        }}
        transition={{ duration: 0.12, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            background: isActive
              ? "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.25), transparent 55%)"
              : "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.08), transparent 55%)",
          }}
        />
      </motion.div>
    </button>
  );
}

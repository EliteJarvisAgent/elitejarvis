"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceOrbProps {
  onTranscript: (text: string) => void;
  isSpeaking?: boolean;
}

export function VoiceOrb({ onTranscript, isSpeaking = false }: VoiceOrbProps) {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [jarvisVolume, setJarvisVolume] = useState(0);
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const emittedRef = useRef(false);

  // Animate orb when Jarvis is speaking
  useEffect(() => {
    if (!isSpeaking) { setJarvisVolume(0); return; }
    const interval = setInterval(() => setJarvisVolume(0.3 + Math.random() * 0.7), 80);
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

  const startListening = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    emittedRef.current = false;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

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
    } catch {}

    recognition.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text && !emittedRef.current) {
        emittedRef.current = true;
        onTranscript(text);
      }
    };

    recognition.onend = () => {
      stopAnalyser();
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  }, [onTranscript, stopAnalyser]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    stopAnalyser();
    setIsListening(false);
  }, [stopAnalyser]);

  const toggle = () => {
    if (isSpeaking) {
      // Interrupt Jarvis
      window.speechSynthesis?.cancel();
      return;
    }
    isListening ? stopListening() : startListening();
  };

  // Pulse scale based on volume
  const scale = 1 + activeVolume * 0.35;
  const glowOpacity = isActive ? 0.3 + activeVolume * 0.5 : 0.15;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Outer glow ring */}
      <div className="relative flex items-center justify-center">
        {/* Glow layers */}
        <div
          className="absolute rounded-full transition-all duration-75"
          style={{
            width: 120,
            height: 120,
            background: `radial-gradient(circle, rgba(59,130,246,${glowOpacity}) 0%, transparent 70%)`,
            transform: `scale(${scale})`,
          }}
        />
        <div
          className="absolute rounded-full transition-all duration-75"
          style={{
            width: 80,
            height: 80,
            background: isSpeaking
              ? `radial-gradient(circle, rgba(99,102,241,${glowOpacity + 0.2}) 0%, transparent 70%)`
              : `radial-gradient(circle, rgba(59,130,246,${glowOpacity * 0.7}) 0%, transparent 70%)`,
            transform: `scale(${scale * 1.1})`,
          }}
        />

        {/* Main orb button */}
        <button
          onClick={toggle}
          className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-75 select-none focus:outline-none"
          style={{
            background: isListening
              ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
              : isSpeaking
              ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
              : "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
            boxShadow: isActive
              ? `0 0 ${20 + activeVolume * 30}px rgba(59,130,246,0.6), 0 0 ${40 + activeVolume * 20}px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.1)`
              : "0 0 10px rgba(59,130,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
            transform: `scale(${1 + activeVolume * 0.08})`,
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {isListening ? (
            <Mic size={24} className="text-white" />
          ) : isSpeaking ? (
            <div className="flex gap-0.5 items-end h-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-white rounded-full animate-bounce"
                  style={{
                    height: `${30 + Math.sin((Date.now() / 200) + i) * 40}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: "0.6s",
                  }}
                />
              ))}
            </div>
          ) : (
            <Mic size={24} className="text-blue-300" />
          )}
        </button>
      </div>

      {/* Status label */}
      <p className="text-xs text-slate-500 select-none">
        {isListening ? (
          <span className="text-blue-400 animate-pulse">Listening...</span>
        ) : isSpeaking ? (
          <span className="text-indigo-400">Tap to interrupt</span>
        ) : (
          <span>Tap to speak</span>
        )}
      </p>
    </div>
  );
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic } from "lucide-react";

interface SpaceOrbProps {
  onTranscript: (text: string) => void;
  isSpeaking: boolean;
  isListening: boolean;
  onListeningChange: (v: boolean) => void;
}

export function SpaceOrb({ onTranscript, isSpeaking, isListening, onListeningChange }: SpaceOrbProps) {
  const [volume, setVolume]         = useState(0);
  const [jarvisVol, setJarvisVol]   = useState(0);
  const recognitionRef = useRef<any>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const animFrameRef   = useRef<number>(0);
  const streamRef      = useRef<MediaStream | null>(null);
  const emittedRef     = useRef(false);

  // Animate orb while Jarvis speaks
  useEffect(() => {
    if (!isSpeaking) { setJarvisVol(0); return; }
    const id = setInterval(() => setJarvisVol(0.3 + Math.random() * 0.7), 60);
    return () => clearInterval(id);
  }, [isSpeaking]);

  const activeVol  = isListening ? volume : isSpeaking ? jarvisVol : 0;
  const isActive   = isListening || isSpeaking;

  const stopAnalyser = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null; analyserRef.current = null;
    setVolume(0);
  }, []);

  const startListening = useCallback(async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    emittedRef.current = false;
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false;
    recognitionRef.current = rec;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser); analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setVolume(Math.min(data.reduce((a, b) => a + b, 0) / data.length / 80, 1));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}

    rec.onresult = (e: any) => {
      const txt = e.results[0]?.[0]?.transcript?.trim();
      if (txt && !emittedRef.current) { emittedRef.current = true; onTranscript(txt); }
    };
    rec.onend = () => { stopAnalyser(); onListeningChange(false); };
    rec.start();
    onListeningChange(true);
  }, [onTranscript, stopAnalyser, onListeningChange]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop(); stopAnalyser(); onListeningChange(false);
  }, [stopAnalyser, onListeningChange]);

  const handleClick = () => {
    if (isSpeaking) { window.speechSynthesis?.cancel(); return; }
    isListening ? stopListening() : startListening();
  };

  // Dynamic glow sizing
  const glowSize   = 180 + activeVol * 80;
  const orbScale   = 1 + activeVol * 0.12;
  const glowColor  = isListening ? "59,130,246" : isSpeaking ? "139,92,246" : "30,64,175";
  const glowAlpha  = isActive ? 0.4 + activeVol * 0.4 : 0.15;

  return (
    <button
      onClick={handleClick}
      className="relative flex items-center justify-center focus:outline-none select-none group"
      style={{ width: 220, height: 220 }}
      aria-label={isListening ? "Stop listening" : isSpeaking ? "Interrupt" : "Speak to Jarvis"}
    >
      {/* Outermost ambient glow */}
      <div className="absolute inset-0 rounded-full transition-all duration-100"
        style={{
          background: `radial-gradient(circle, rgba(${glowColor},${glowAlpha * 0.4}) 0%, transparent 70%)`,
          transform: `scale(${1.6 + activeVol * 0.3})`,
          filter: "blur(20px)",
        }}
      />

      {/* Pulsing ring 1 */}
      <div className="absolute rounded-full"
        style={{
          width: glowSize, height: glowSize,
          background: `radial-gradient(circle, rgba(${glowColor},${glowAlpha}) 0%, rgba(${glowColor},0) 70%)`,
          transition: "all 0.08s ease-out",
          filter: "blur(6px)",
        }}
      />

      {/* Pulsing ring 2 — offset timing */}
      <div className="absolute rounded-full animate-pulse"
        style={{
          width: 130 + activeVol * 40,
          height: 130 + activeVol * 40,
          border: `1px solid rgba(${glowColor}, ${isActive ? 0.5 : 0.15})`,
          transition: "all 0.1s ease-out",
        }}
      />

      {/* Inner ring */}
      <div className="absolute rounded-full"
        style={{
          width: 100 + activeVol * 20,
          height: 100 + activeVol * 20,
          border: `1px solid rgba(${glowColor}, ${isActive ? 0.7 : 0.25})`,
          transition: "all 0.08s ease-out",
        }}
      />

      {/* Main orb sphere */}
      <div
        className="relative z-10 rounded-full flex items-center justify-center"
        style={{
          width: 90,
          height: 90,
          background: isListening
            ? "radial-gradient(circle at 35% 35%, #60a5fa, #1d4ed8 50%, #1e3a8a)"
            : isSpeaking
            ? "radial-gradient(circle at 35% 35%, #c084fc, #7c3aed 50%, #4c1d95)"
            : "radial-gradient(circle at 35% 35%, #3b82f6, #1e40af 50%, #0f172a)",
          boxShadow: isActive
            ? `0 0 ${30 + activeVol * 40}px rgba(${glowColor}, 0.8), 0 0 ${60 + activeVol * 30}px rgba(${glowColor}, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)`
            : `0 0 15px rgba(30,64,175,0.4), inset 0 2px 4px rgba(255,255,255,0.1)`,
          transform: `scale(${orbScale})`,
          transition: "transform 0.08s ease-out, box-shadow 0.08s ease-out",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        {/* Inner highlight */}
        <div className="absolute top-3 left-3 w-6 h-6 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)" }}
        />

        {/* Center icon */}
        {isListening ? (
          <Mic size={28} className="text-white drop-shadow-lg" />
        ) : isSpeaking ? (
          <div className="flex gap-0.5 items-end h-6">
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="w-1 bg-white rounded-full animate-bounce"
                style={{ height: `${40 + Math.sin(i * 0.8) * 40}%`, animationDelay: `${i * 0.08}s`, animationDuration: "0.5s" }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Mic size={22} className="text-blue-200 group-hover:text-white transition-colors" />
          </div>
        )}
      </div>

      {/* Scan lines — subtle HUD effect */}
      {isActive && (
        <>
          <div className="absolute rounded-full animate-ping opacity-20"
            style={{ width: 110, height: 110, border: "1px solid white", animationDuration: "1.5s" }}
          />
          <div className="absolute rounded-full animate-ping opacity-10"
            style={{ width: 140, height: 140, border: "1px solid white", animationDuration: "2s", animationDelay: "0.5s" }}
          />
        </>
      )}
    </button>
  );
}

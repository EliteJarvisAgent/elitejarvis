import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceOrb } from "./VoiceOrb";

interface SubAgent {
  id: string;
  name: string;
  label: string;
  icon: string;
  status: "idle" | "active" | "done";
}

const initialAgents: SubAgent[] = [
  { id: "research", name: "Research", label: "R", icon: "🔍", status: "idle" },
  { id: "security", name: "Security", label: "S", icon: "🛡️", status: "idle" },
  { id: "data", name: "DataSync", label: "D", icon: "⚡", status: "idle" },
  { id: "content", name: "Content", label: "C", icon: "✦", status: "idle" },
  { id: "devops", name: "DevOps", label: "O", icon: "⚙️", status: "idle" },
];

function getAgentPosition(index: number, total: number, radius: number) {
  // Full circle, starting from top (-π/2), evenly spaced
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

interface AgentNetworkProps {
  onTranscript: (text: string) => void;
  isSpeaking: boolean;
  isProcessing?: boolean;
  onInterrupt?: () => void;
  onUserInteraction?: () => void;
  onVoiceUnavailable?: (reason: string) => void;
  onTranscriptPreview?: (text: string) => void;
  onListeningChange?: (isListening: boolean) => void;
}

export function AgentNetwork({ onTranscript, isSpeaking, isProcessing = false, onInterrupt, onUserInteraction, onVoiceUnavailable, onTranscriptPreview, onListeningChange }: AgentNetworkProps) {
  const [agents, setAgents] = useState<SubAgent[]>(initialAgents);
  const [activeConnections, setActiveConnections] = useState<string[]>([]);

  const activateAgents = useCallback((agentIds: string[]) => {
    setActiveConnections(agentIds);
    setAgents((prev) =>
      prev.map((a) => ({
        ...a,
        status: agentIds.includes(a.id) ? "active" : "idle",
      }))
    );
  }, []);

  const deactivateAll = useCallback(() => {
    setActiveConnections([]);
    setAgents((prev) => prev.map((a) => ({ ...a, status: "idle" as const })));
  }, []);

  useEffect(() => {
    if (!isProcessing) {
      const timer = setTimeout(deactivateAll, 600);
      return () => clearTimeout(timer);
    }
  }, [isProcessing, deactivateAll]);

  const radius = 150;
  const viewSize = 420;
  const center = viewSize / 2;

  return (
    <div className="relative flex items-center justify-center w-full max-w-[420px] mx-auto aspect-square">
      {/* SVG connection lines + orbital ring */}
      <svg
        className="absolute inset-0 pointer-events-none"
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Subtle orbital ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(185, 40%, 20%)"
          strokeWidth="0.5"
          strokeDasharray="3 6"
          opacity="0.4"
        />

        {/* Connection lines */}
        {agents.map((agent, i) => {
          const pos = getAgentPosition(i, agents.length, radius);
          const isConnected = activeConnections.includes(agent.id);
          return (
            <g key={agent.id}>
              <motion.line
                x1={center}
                y1={center}
                x2={center + pos.x}
                y2={center + pos.y}
                stroke={isConnected ? "hsl(185, 90%, 48%)" : "hsl(185, 30%, 18%)"}
                strokeWidth={isConnected ? 1.5 : 0.5}
                strokeDasharray={isConnected ? "none" : "2 4"}
                initial={{ opacity: 0 }}
                animate={{ opacity: isConnected ? 0.9 : 0.15 }}
                transition={{ duration: 0.4 }}
              />
              {isConnected && (
                <motion.circle
                  r={2.5}
                  fill="hsl(185, 90%, 60%)"
                  filter="url(#glow)"
                  initial={{ cx: center, cy: center, opacity: 0 }}
                  animate={{
                    cx: [center, center + pos.x],
                    cy: [center, center + pos.y],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </g>
          );
        })}

        {/* Glow filter for data pulses */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Sub-agent nodes */}
      {agents.map((agent, i) => {
        const pos = getAgentPosition(i, agents.length, radius);
        const isActive = agent.status === "active";
        const isDone = agent.status === "done";
        const pctX = ((center + pos.x) / viewSize) * 100;
        const pctY = ((center + pos.y) / viewSize) * 100;

        return (
          <motion.div
            key={agent.id}
            className="absolute flex flex-col items-center gap-1.5"
            style={{
              left: `${pctX}%`,
              top: `${pctY}%`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.5, type: "spring", stiffness: 200 }}
          >
            {/* Node */}
            <motion.div
              className="relative rounded-full flex items-center justify-center h-11 w-11 sm:h-14 sm:w-14 backdrop-blur-sm border"
              animate={{
                borderColor: isActive
                  ? "hsl(185, 90%, 50%)"
                  : isDone
                  ? "hsl(160, 70%, 45%)"
                  : "hsl(220, 20%, 20%)",
                background: isActive
                  ? "radial-gradient(circle at 35% 30%, hsl(185, 80%, 25%), hsl(185, 60%, 8%))"
                  : isDone
                  ? "radial-gradient(circle at 35% 30%, hsl(160, 60%, 20%), hsl(160, 40%, 6%))"
                  : "radial-gradient(circle at 35% 30%, hsl(220, 25%, 16%), hsl(220, 20%, 6%))",
                boxShadow: isActive
                  ? "0 0 30px 8px hsl(185, 90%, 48%, 0.25), inset 0 0 15px hsl(185, 90%, 50%, 0.1)"
                  : isDone
                  ? "0 0 20px 4px hsl(160, 70%, 45%, 0.15)"
                  : "0 0 10px 2px hsl(220, 20%, 10%, 0.3)",
                scale: isActive ? 1.1 : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-base sm:text-lg">{agent.icon}</span>

              {/* Active pulse ring */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute inset-[-3px] rounded-full border border-primary/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: [0.6, 0], scale: [1, 1.4] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>

              {/* Status dot */}
              <motion.div
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background"
                animate={{
                  background: isActive
                    ? "hsl(185, 90%, 55%)"
                    : isDone
                    ? "hsl(160, 70%, 50%)"
                    : "hsl(220, 15%, 30%)",
                }}
              />
            </motion.div>

            {/* Label */}
            <motion.span
              className="text-[9px] sm:text-[10px] font-mono-display tracking-widest uppercase whitespace-nowrap"
              animate={{
                color: isActive ? "hsl(185, 90%, 65%)" : isDone ? "hsl(160, 70%, 55%)" : "hsl(220, 15%, 38%)",
              }}
              transition={{ duration: 0.3 }}
            >
              {agent.name}
            </motion.span>
          </motion.div>
        );
      })}

      {/* Central Jarvis label */}
      <div className="absolute" style={{ top: "calc(50% + 65px)", left: "50%", transform: "translateX(-50%)" }}>
        <motion.span
          className="text-[10px] sm:text-[11px] font-mono-display uppercase tracking-[0.3em] text-primary/70"
          animate={{ opacity: isSpeaking ? [0.5, 1, 0.5] : 0.7 }}
          transition={isSpeaking ? { duration: 1.5, repeat: Infinity } : {}}
        >
          Jarvis
        </motion.span>
      </div>

      {/* Central Jarvis orb */}
      <div className="absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
        <VoiceOrb
          onTranscript={onTranscript}
          isSpeaking={isSpeaking}
          onInterrupt={onInterrupt}
          onUserInteraction={onUserInteraction}
          onVoiceUnavailable={onVoiceUnavailable}
          onTranscriptPreview={onTranscriptPreview}
          onListeningChange={onListeningChange}
        />
      </div>
    </div>
  );
}

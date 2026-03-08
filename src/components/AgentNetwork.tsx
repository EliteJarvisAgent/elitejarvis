import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceOrb } from "./VoiceOrb";

interface SubAgent {
  id: string;
  name: string;
  label: string;
  status: "idle" | "active" | "done";
}

const initialAgents: SubAgent[] = [
  { id: "research", name: "ResearchBot", label: "R", status: "idle" },
  { id: "security", name: "SecBot", label: "S", status: "idle" },
  { id: "data", name: "DataSync", label: "D", status: "idle" },
  { id: "content", name: "ContentGen", label: "C", status: "idle" },
  { id: "devops", name: "DevOps", label: "O", status: "idle" },
];

function getAgentPosition(index: number, total: number, radius: number) {
  const startAngle = Math.PI * 1.15;
  const endAngle = Math.PI * 1.85;
  const angle = startAngle + (endAngle - startAngle) * (index / (total - 1));
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

  // Connection lines only activate when specific agents are explicitly called
  // via activateAgents(). No random activation during general processing.
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

  // When processing stops, clear any active connections
  useEffect(() => {
    if (!isProcessing) {
      const timer = setTimeout(deactivateAll, 600);
      return () => clearTimeout(timer);
    }
  }, [isProcessing, deactivateAll]);

  const centerX = 0;
  const centerY = 0;
  // Responsive radius and sizes
  const radius = 180;
  const smallRadius = 110;
  const nodeSize = 48;
  const smallNodeSize = 36;
  const agentOrbCenterYOffset = 30;

  return (
    <div className="relative flex items-center justify-center w-full max-w-[420px] mx-auto aspect-[420/380] sm:w-[420px] sm:h-[380px] sm:aspect-auto">
      {/* SVG connection lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        viewBox="-210 -220 420 400"
        style={{ width: "100%", height: "100%" }}
      >
        {agents.map((agent, i) => {
          const pos = getAgentPosition(i, agents.length, radius);
          const isConnected = activeConnections.includes(agent.id);
          return (
            <g key={agent.id}>
              <motion.line
                x1={centerX}
                y1={centerY}
                x2={pos.x}
                y2={pos.y - agentOrbCenterYOffset}
                stroke={isConnected ? "hsl(185, 90%, 48%)" : "hsl(222, 18%, 16%)"}
                strokeWidth={isConnected ? 2 : 1}
                strokeDasharray={isConnected ? "none" : "4 4"}
                initial={{ opacity: 0 }}
                animate={{ opacity: isConnected ? 0.8 : 0.2, strokeWidth: isConnected ? 2 : 1 }}
                transition={{ duration: 0.4 }}
              />
              {isConnected && (
                <motion.circle
                  r={3}
                  fill="hsl(185, 90%, 60%)"
                  initial={{ cx: centerX, cy: centerY, opacity: 0 }}
                  animate={{ cx: [centerX, pos.x], cy: [centerY, pos.y - agentOrbCenterYOffset], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Sub-agent nodes - use percentage positioning for responsiveness */}
      {agents.map((agent, i) => {
        const pos = getAgentPosition(i, agents.length, radius);
        const isActive = agent.status === "active";
        const isDone = agent.status === "done";
        // Convert to percentage of viewBox
        const pctX = ((pos.x + 210) / 420) * 100;
        const pctY = ((pos.y - agentOrbCenterYOffset + 220) / 400) * 100;

        return (
          <motion.div
            key={agent.id}
            className="absolute flex flex-col items-center gap-1"
            style={{
              left: `${pctX}%`,
              top: `${pctY}%`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <motion.div
              className="rounded-full flex items-center justify-center font-mono-display text-[10px] sm:text-xs font-semibold relative h-9 w-9 sm:h-12 sm:w-12"
              animate={{
                background: isActive
                  ? "radial-gradient(circle at 40% 35%, hsl(185, 90%, 55%), hsl(185, 90%, 30%))"
                  : isDone
                  ? "radial-gradient(circle at 40% 35%, hsl(160, 70%, 50%), hsl(160, 70%, 25%))"
                  : "radial-gradient(circle at 40% 35%, hsl(222, 25%, 18%), hsl(222, 25%, 10%))",
                boxShadow: isActive
                  ? "0 0 24px 6px hsl(185, 90%, 48%, 0.3)"
                  : isDone
                  ? "0 0 16px 4px hsl(160, 70%, 45%, 0.2)"
                  : "0 0 8px 2px hsl(222, 18%, 16%, 0.3)",
                scale: isActive ? 1.15 : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <span className={isActive || isDone ? "text-primary-foreground" : "text-muted-foreground"}>
                {agent.label}
              </span>
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute inset-[-4px] rounded-full border border-primary/40"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1.1 }}
                    exit={{ opacity: 0, scale: 1.3 }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                  />
                )}
              </AnimatePresence>
            </motion.div>

            <motion.span
              className="text-[8px] sm:text-[10px] font-mono-display tracking-wider whitespace-nowrap"
              animate={{
                color: isActive ? "hsl(185, 90%, 60%)" : isDone ? "hsl(160, 70%, 55%)" : "hsl(220, 15%, 40%)",
              }}
              transition={{ duration: 0.3 }}
            >
              {agent.name}
            </motion.span>
          </motion.div>
        );
      })}

      {/* Central Jarvis label */}
      <div className="absolute" style={{ top: "calc(50% + 70px)", left: "50%", transform: "translateX(-50%)" }}>
        <motion.span
          className="text-[10px] sm:text-[11px] font-mono-display uppercase tracking-[0.3em] text-primary/70"
          animate={{ opacity: isSpeaking ? [0.5, 1, 0.5] : 0.7 }}
          transition={isSpeaking ? { duration: 1.5, repeat: Infinity } : {}}
        >
          Jarvis
        </motion.span>
      </div>

      {/* Central Jarvis orb - responsive sizing */}
      <div className="absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -60%)" }}>
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

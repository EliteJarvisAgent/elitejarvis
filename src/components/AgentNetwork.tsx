import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceOrb } from "./VoiceOrb";

interface SubAgent {
  id: string;
  name: string;
  icon: string;
  status: "idle" | "active" | "done";
}

const initialAgents: SubAgent[] = [
  { id: "research", name: "Research", icon: "🔍", status: "idle" },
  { id: "security", name: "Security", icon: "🛡️", status: "idle" },
  { id: "data", name: "DataSync", icon: "⚡", status: "idle" },
  { id: "content", name: "Content", icon: "✦", status: "idle" },
  { id: "devops", name: "DevOps", icon: "⚙️", status: "idle" },
];

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

  // Org-chart positions: Jarvis at center-top, agents spread below
  // 5 agents evenly across the bottom row
  const agentPositions = [
    { x: 52, y: 250 },
    { x: 136, y: 250 },
    { x: 220, y: 250 },
    { x: 304, y: 250 },
    { x: 388, y: 250 },
  ];

  const jarvisCenter = { x: 220, y: 70 };
  const viewW = 440;
  const viewH = 320;

  return (
    <div className="relative flex items-center justify-center w-full max-w-[480px] mx-auto" style={{ aspectRatio: `${viewW}/${viewH}` }}>
      {/* SVG lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        viewBox={`0 0 ${viewW} ${viewH}`}
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {agents.map((agent, i) => {
          const pos = agentPositions[i];
          const isConnected = activeConnections.includes(agent.id);
          // Org-chart style: vertical line down from Jarvis, then horizontal to agent
          const midY = 210;
          return (
            <g key={agent.id}>
              {/* Vertical from Jarvis */}
              <motion.line
                x1={jarvisCenter.x} y1={jarvisCenter.y + 40}
                x2={jarvisCenter.x} y2={midY}
                stroke={isConnected ? "hsl(185, 90%, 48%)" : "hsl(185, 25%, 18%)"}
                strokeWidth={isConnected ? 1.5 : 0.7}
                initial={{ opacity: 0 }}
                animate={{ opacity: isConnected ? 0.9 : 0.2 }}
                transition={{ duration: 0.4 }}
              />
              {/* Horizontal to agent column */}
              <motion.line
                x1={jarvisCenter.x} y1={midY}
                x2={pos.x} y2={midY}
                stroke={isConnected ? "hsl(185, 90%, 48%)" : "hsl(185, 25%, 18%)"}
                strokeWidth={isConnected ? 1.5 : 0.7}
                initial={{ opacity: 0 }}
                animate={{ opacity: isConnected ? 0.9 : 0.2 }}
                transition={{ duration: 0.4 }}
              />
              {/* Vertical down to agent */}
              <motion.line
                x1={pos.x} y1={midY}
                x2={pos.x} y2={pos.y - 25}
                stroke={isConnected ? "hsl(185, 90%, 48%)" : "hsl(185, 25%, 18%)"}
                strokeWidth={isConnected ? 1.5 : 0.7}
                initial={{ opacity: 0 }}
                animate={{ opacity: isConnected ? 0.9 : 0.2 }}
                transition={{ duration: 0.4 }}
              />
              {/* Data pulse along the path */}
              {isConnected && (
                <motion.circle
                  r={2.5}
                  fill="hsl(185, 90%, 60%)"
                  filter="url(#glow)"
                  initial={{ cx: jarvisCenter.x, cy: jarvisCenter.y + 40, opacity: 0 }}
                  animate={{
                    cx: [jarvisCenter.x, jarvisCenter.x, pos.x, pos.x],
                    cy: [jarvisCenter.y + 40, midY, midY, pos.y - 25],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </g>
          );
        })}

        {/* Horizontal bus line */}
        <motion.line
          x1={agentPositions[0].x} y1={210}
          x2={agentPositions[4].x} y2={210}
          stroke="hsl(185, 25%, 18%)"
          strokeWidth={0.7}
          opacity={0.2}
        />
      </svg>

      {/* Agent nodes */}
      {agents.map((agent, i) => {
        const pos = agentPositions[i];
        const isActive = agent.status === "active";
        const isDone = agent.status === "done";
        const pctX = (pos.x / viewW) * 100;
        const pctY = (pos.y / viewH) * 100;

        return (
          <motion.div
            key={agent.id}
            className="absolute flex flex-col items-center gap-1.5"
            style={{
              left: `${pctX}%`,
              top: `${pctY}%`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5, type: "spring", stiffness: 200 }}
          >
            <motion.div
              className="relative rounded-xl flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 backdrop-blur-sm border"
              animate={{
                borderColor: isActive
                  ? "hsl(185, 90%, 50%)"
                  : isDone
                  ? "hsl(160, 70%, 45%)"
                  : "hsl(220, 20%, 20%)",
                background: isActive
                  ? "radial-gradient(circle at 35% 30%, hsl(185, 80%, 20%), hsl(185, 60%, 6%))"
                  : isDone
                  ? "radial-gradient(circle at 35% 30%, hsl(160, 60%, 16%), hsl(160, 40%, 5%))"
                  : "radial-gradient(circle at 35% 30%, hsl(220, 25%, 14%), hsl(220, 20%, 5%))",
                boxShadow: isActive
                  ? "0 0 24px 6px hsl(185, 90%, 48%, 0.25), inset 0 0 12px hsl(185, 90%, 50%, 0.08)"
                  : "0 0 8px 2px hsl(220, 20%, 8%, 0.3)",
                scale: isActive ? 1.1 : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-sm sm:text-base">{agent.icon}</span>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute inset-[-3px] rounded-xl border border-primary/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: [0.6, 0], scale: [1, 1.3] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>

              <motion.div
                className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background"
                animate={{
                  background: isActive ? "hsl(185, 90%, 55%)" : isDone ? "hsl(160, 70%, 50%)" : "hsl(220, 15%, 28%)",
                }}
              />
            </motion.div>

            <motion.span
              className="text-[8px] sm:text-[10px] font-mono-display tracking-wider uppercase whitespace-nowrap"
              animate={{
                color: isActive ? "hsl(185, 90%, 65%)" : isDone ? "hsl(160, 70%, 55%)" : "hsl(220, 15%, 36%)",
              }}
            >
              {agent.name}
            </motion.span>
          </motion.div>
        );
      })}

      {/* Jarvis label */}
      <div className="absolute" style={{ top: `${((jarvisCenter.y + 55) / viewH) * 100}%`, left: "50%", transform: "translateX(-50%)" }}>
        <motion.span
          className="text-[10px] sm:text-[11px] font-mono-display uppercase tracking-[0.3em] text-primary/70"
          animate={{ opacity: isSpeaking ? [0.5, 1, 0.5] : 0.7 }}
          transition={isSpeaking ? { duration: 1.5, repeat: Infinity } : {}}
        >
          Jarvis
        </motion.span>
      </div>

      {/* Central Jarvis orb */}
      <div className="absolute" style={{ top: `${(jarvisCenter.y / viewH) * 100}%`, left: "50%", transform: "translate(-50%, -50%)" }}>
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

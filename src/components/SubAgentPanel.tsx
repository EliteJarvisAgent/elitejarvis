import { motion } from "framer-motion";
import { Activity, Cpu, Zap, AlertCircle } from "lucide-react";

interface Agent {
  name: string;
  status: "active" | "idle" | "error";
  task: string;
  capacity: number;
}

const agents: Agent[] = [
  { name: "ResearchBot", status: "active", task: "Competitor analysis", capacity: 72 },
  { name: "SecBot", status: "active", task: "API security audit", capacity: 45 },
  { name: "DataSync", status: "idle", task: "Standby", capacity: 100 },
  { name: "ContentGen", status: "error", task: "Rate limited", capacity: 0 },
  { name: "DevOps Agent", status: "idle", task: "Awaiting deploy", capacity: 90 },
];

const statusStyle: Record<string, { dot: string; label: string }> = {
  active: { dot: "bg-success animate-pulse", label: "text-success" },
  idle: { dot: "bg-muted-foreground", label: "text-muted-foreground" },
  error: { dot: "bg-destructive animate-pulse", label: "text-destructive" },
};

export function SubAgentPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/50">
        <h2 className="font-mono text-xs uppercase tracking-widest text-primary">
          Sub-Agents
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.map((agent, i) => {
          const s = statusStyle[agent.status];
          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-panel rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-primary/60" />
                  <span className="text-sm font-medium text-foreground">{agent.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className={`text-[10px] font-mono uppercase ${s.label}`}>{agent.status}</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground font-mono mt-1.5 ml-5">
                {agent.task}
              </p>

              <div className="mt-2 ml-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground font-mono">Capacity</span>
                  <span className="text-[10px] font-mono text-foreground">{agent.capacity}%</span>
                </div>
                <div className="h-1 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${agent.capacity}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={`h-full rounded-full ${
                      agent.capacity > 60 ? "bg-success" : agent.capacity > 20 ? "bg-warning" : "bg-destructive"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

import { agents } from "@/data/agents";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Zap } from "lucide-react";

const statusStyle: Record<string, { badge: string; label: string }> = {
  active: { badge: "bg-success/15 text-success border-success/30", label: "Active" },
  idle: { badge: "bg-muted text-muted-foreground border-border", label: "Idle" },
  error: { badge: "bg-destructive/15 text-destructive border-destructive/30", label: "Error" },
};

export default function AgentsPage() {
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Agent Fleet</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of all AI agents, their roles, and current status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {agents.map((agent, i) => {
          const s = statusStyle[agent.status];
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              className="glass-panel-elevated rounded-2xl overflow-hidden card-hover group"
            >
              {/* Agent image */}
              <div className="h-48 bg-secondary/30 flex items-center justify-center overflow-hidden">
                <img
                  src={agent.image}
                  alt={agent.name}
                  className="h-44 w-44 object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{agent.name}</h3>
                    <p className="text-xs font-mono-display text-primary tracking-wide uppercase">
                      {agent.role}
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono-display uppercase px-2.5 py-1 rounded-full border ${s.badge}`}>
                    {s.label}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mt-3 mb-4">
                  {agent.description}
                </p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {agent.capabilities.map((cap) => (
                    <Badge
                      key={cap}
                      variant="secondary"
                      className="text-[10px] font-mono-display bg-secondary/80 border-border/50"
                    >
                      {cap}
                    </Badge>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs text-muted-foreground">
                      <strong className="text-foreground">{agent.tasksCompleted}</strong> tasks
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      <strong className="text-foreground">{agent.uptime}</strong> uptime
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

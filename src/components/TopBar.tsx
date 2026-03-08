import { CheckCircle, Clock, AlertTriangle, Mic, Settings, Bell } from "lucide-react";
import { motion } from "framer-motion";

const metrics = [
  { label: "Completed Today", value: "14", icon: CheckCircle, color: "text-success" },
  { label: "Time Saved", value: "3.2h", icon: Clock, color: "text-primary" },
  { label: "Pending", value: "7", icon: AlertTriangle, color: "text-warning" },
];

export function TopBar() {
  return (
    <header className="h-16 glass-panel border-b border-border/50 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
          <span className="font-mono text-primary font-bold text-sm">J</span>
        </div>
        <h1 className="font-mono font-bold text-lg tracking-wider text-primary">
          JARVIS
        </h1>
        <span className="text-muted-foreground text-xs font-mono ml-2 hidden sm:inline">
          AI MANAGER v2.1
        </span>
      </div>

      <div className="hidden md:flex items-center gap-6">
        {metrics.map((m) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <m.icon className={`h-4 w-4 ${m.color}`} />
            <div className="flex flex-col">
              <span className="font-mono text-sm font-semibold text-foreground">{m.value}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button className="h-9 w-9 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors border border-primary/20">
          <Mic className="h-4 w-4 text-primary" />
        </button>
        <button className="h-9 w-9 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
        </button>
        <button className="h-9 w-9 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}

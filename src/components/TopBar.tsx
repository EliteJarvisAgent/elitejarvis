import { useState } from "react";
import { CheckCircle, Clock, AlertTriangle, Bell, Settings, Activity, ListTodo } from "lucide-react";
import { motion } from "framer-motion";
import { useTasks } from "@/hooks/use-tasks";
import { TaskQueue } from "@/components/TaskQueue";

function useMetrics() {
  const { tasks } = useTasks();
  const completed = tasks.filter(t => t.status === "done").length;
  const pending = tasks.filter(t => t.status !== "done").length;
  return [
    { label: "Completed", value: String(completed), icon: CheckCircle, color: "text-success", bg: "bg-success/10 border-success/20" },
    { label: "Time Saved", value: completed > 0 ? `${(completed * 0.2).toFixed(1)}h` : "0h", icon: Clock, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    { label: "Pending", value: String(pending), icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  ];
}

export function TopBar() {
  const metrics = useMetrics();
  const [showTasks, setShowTasks] = useState(false);

  return (
    <>
      <header className="h-[72px] bg-card/60 backdrop-blur-xl border-b border-border/40 flex items-center justify-between px-6 lg:px-8">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center glow-primary border border-primary/25">
            <Activity className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-base tracking-wider text-foreground">
              JARVIS
            </h1>
            <span className="text-muted-foreground text-[10px] font-mono tracking-wide">
              AI COMMAND CENTER
            </span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="hidden md:flex items-center gap-3">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border ${m.bg}`}
            >
              <m.icon className={`h-4 w-4 ${m.color}`} />
              <div className="flex flex-col">
                <span className="font-mono text-sm font-semibold text-foreground leading-none">{m.value}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{m.label}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowTasks(!showTasks)}
            className="lg:hidden h-9 w-9 rounded-xl hover:bg-secondary/80 flex items-center justify-center transition-all duration-200 border border-transparent hover:border-border/50"
          >
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="h-9 w-9 rounded-xl hover:bg-secondary/80 flex items-center justify-center transition-all duration-200 border border-transparent hover:border-border/50">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="h-9 w-9 rounded-xl hover:bg-secondary/80 flex items-center justify-center transition-all duration-200 border border-transparent hover:border-border/50">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Mobile Task Panel */}
      {showTasks && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border/40">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary font-semibold">Task Queue</span>
            <button onClick={() => setShowTasks(false)} className="text-muted-foreground hover:text-foreground text-sm">Close</button>
          </div>
          <div className="flex-1 overflow-hidden">
            <TaskQueue />
          </div>
        </div>
      )}
    </>
  );
}

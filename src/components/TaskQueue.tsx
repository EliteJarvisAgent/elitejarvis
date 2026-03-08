import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Clock, User2, MoreHorizontal, CheckCircle2, Loader2, AlertOctagon, Timer } from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { agents } from "@/data/agents";

type DisplayStatus = "in-progress" | "pending" | "done" | "blocked";

interface DisplayTask {
  id: string;
  title: string;
  status: DisplayStatus;
  priority: "high" | "medium" | "low";
  assignee: string;
}

function mapStatus(s: string): DisplayStatus {
  if (s === "in-progress") return "in-progress";
  if (s === "done") return "done";
  if (s === "review") return "blocked";
  return "pending"; // backlog, todo
}

function mapPriority(p: string): "high" | "medium" | "low" {
  if (p === "critical" || p === "high") return "high";
  if (p === "medium") return "medium";
  return "low";
}

const statusConfig: Record<DisplayStatus, { label: string; icon: typeof CheckCircle2; className: string; dotClass: string }> = {
  "in-progress": {
    label: "Active",
    icon: Loader2,
    className: "bg-primary/12 text-primary border-primary/25",
    dotClass: "animate-pulse-glow",
  },
  pending: {
    label: "Pending",
    icon: Timer,
    className: "bg-warning/12 text-warning border-warning/25",
    dotClass: "",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    className: "bg-success/12 text-success border-success/25",
    dotClass: "",
  },
  blocked: {
    label: "Blocked",
    icon: AlertOctagon,
    className: "bg-destructive/12 text-destructive border-destructive/25",
    dotClass: "",
  },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  high: { color: "bg-destructive", label: "High" },
  medium: { color: "bg-warning", label: "Med" },
  low: { color: "bg-muted-foreground", label: "Low" },
};

export function TaskQueue() {
  const { tasks: rawTasks } = useTasks();
  
  const displayTasks = useMemo<DisplayTask[]>(() => 
    rawTasks.map(t => ({
      id: t.id,
      title: t.title,
      status: mapStatus(t.status),
      priority: mapPriority(t.priority),
      assignee: t.assigneeId ? (agents.find(a => a.id === t.assigneeId)?.name ?? "Unassigned") : "Unassigned",
    })),
    [rawTasks]
  );

  const [tasks, setTasks] = useState<DisplayTask[]>([]);
  
  useEffect(() => {
    setTasks(displayTasks);
  }, [displayTasks]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-primary font-semibold">
              Task Queue
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {tasks.filter(t => t.status !== "done").length} active · {tasks.length} total
            </p>
          </div>
          <div className="flex gap-1">
            {(["in-progress", "pending", "blocked", "done"] as DisplayStatus[]).map((s) => {
              const count = tasks.filter(t => t.status === s).length;
              const sc = statusConfig[s];
              return (
                <span key={s} className={`text-[9px] font-mono px-2 py-0.5 rounded-lg border ${sc.className}`}>
                  {count}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task List - Drag to reorder */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <Reorder.Group axis="y" values={tasks} onReorder={setTasks} className="space-y-2.5">
          <AnimatePresence>
            {tasks.map((task, i) => {
              const sc = statusConfig[task.status];
              const pc = priorityConfig[task.priority];
              const StatusIcon = sc.icon;
              const isActive = task.status === "in-progress";

              return (
                <Reorder.Item
                  key={task.id}
                  value={task}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className={`glass-panel-elevated rounded-xl p-4 cursor-grab active:cursor-grabbing card-hover group ${
                    isActive ? "animate-pulse-glow" : ""
                  }`}
                  whileDrag={{ scale: 1.03, boxShadow: "0 12px 40px -8px hsl(185 90% 48% / 0.2)" }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 ${pc.color} ${sc.dotClass}`} />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground leading-snug block">
                          {task.title}
                        </span>
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 hover:bg-secondary rounded-lg">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center gap-2.5 mt-3 ml-5.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-lg border ${sc.className}`}>
                      <StatusIcon className={`h-3 w-3 ${isActive ? "animate-spin" : ""}`} />
                      {sc.label}
                    </span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User2 className="h-3 w-3" />
                      <span className="text-[11px] font-mono">{task.assignee}</span>
                    </div>
                    {task.eta && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-[11px] font-mono">{task.eta}</span>
                      </div>
                    )}
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground ml-auto`}>
                      {pc.label}
                    </span>
                  </div>
                </Reorder.Item>
              );
            })}
          </AnimatePresence>
        </Reorder.Group>
      </div>
    </div>
  );
}

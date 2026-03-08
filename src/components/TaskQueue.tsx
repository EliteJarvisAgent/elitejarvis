import { motion } from "framer-motion";
import { ArrowUpRight, Clock, User2, MoreHorizontal } from "lucide-react";

type TaskStatus = "in-progress" | "pending" | "done" | "blocked";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: "high" | "medium" | "low";
  assignee: string;
  eta?: string;
}

const tasks: Task[] = [
  { id: "1", title: "Q1 Revenue Report — Final Review", status: "in-progress", priority: "high", assignee: "Sarah", eta: "2h" },
  { id: "2", title: "Website Redesign — Brand Guidelines", status: "blocked", priority: "high", assignee: "Marketing", eta: "24h" },
  { id: "3", title: "Client Onboarding Flow v2", status: "in-progress", priority: "medium", assignee: "Jarvis", eta: "4h" },
  { id: "4", title: "Deploy Staging Environment", status: "pending", priority: "medium", assignee: "DevOps Agent" },
  { id: "5", title: "Weekly Team Sync Notes", status: "done", priority: "low", assignee: "Jarvis" },
  { id: "6", title: "Update CRM Pipeline Stages", status: "pending", priority: "low", assignee: "Unassigned" },
  { id: "7", title: "Security Audit — API Endpoints", status: "in-progress", priority: "high", assignee: "SecBot" },
];

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  "in-progress": { label: "Active", className: "bg-primary/15 text-primary border-primary/30" },
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30" },
  done: { label: "Done", className: "bg-success/15 text-success border-success/30" },
  blocked: { label: "Blocked", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const priorityDot: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-muted-foreground",
};

export function TaskQueue() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-primary">
          Task Queue
        </h2>
        <span className="font-mono text-xs text-muted-foreground">{tasks.length} tasks</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.map((task, i) => {
          const sc = statusConfig[task.status];
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel rounded-lg p-3 hover:border-primary/30 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${priorityDot[task.priority]}`} />
                  <span className="text-sm font-medium truncate text-foreground">{task.title}</span>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-2 ml-4">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${sc.className}`}>
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
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

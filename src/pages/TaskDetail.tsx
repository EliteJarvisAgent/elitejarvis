import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, Clock, ChevronDown, ChevronUp, Trash2, Archive, Terminal, Copy, Check, CircleDot } from "lucide-react";
import { useAgents } from "@/hooks/use-agents";
import { statusColumns, type Task, type TaskStatus } from "@/data/tasks";
import { useTasks } from "@/hooks/use-tasks";
import { fetchTaskActivity, logTaskActivity } from "@/lib/api-extra";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  backlog: { bg: "bg-secondary", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  todo: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  "in-progress": { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" },
  review: { bg: "bg-info/10", text: "text-info", dot: "bg-info" },
  done: { bg: "bg-success/10", text: "text-success", dot: "bg-success" },
};

const activityIcons: Record<string, { color: string; icon: string }> = {
  created: { color: "text-primary", icon: "●" },
  status_changed: { color: "text-warning", icon: "◉" },
  assigned: { color: "text-info", icon: "👤" },
  completed: { color: "text-success", icon: "✓" },
};

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { tasks, updateTask, deleteTask } = useTasks();
  const { agents } = useAgents();
  const [activity, setActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [logsOpen, setLogsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const task = tasks.find(t => t.id === taskId);

  useEffect(() => {
    if (taskId) {
      fetchTaskActivity(taskId).then(d => { setActivity(d); setLoadingActivity(false); }).catch(() => setLoadingActivity(false));
    }
  }, [taskId]);

  if (!task) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Task not found</p>
        <button onClick={() => navigate("/tasks")} className="mt-4 text-primary hover:underline text-sm">← Back to Tasks</button>
      </div>
    );
  }

  const agent = task.assigneeId ? agents.find(a => a.id === task.assigneeId) : null;
  const ss = statusStyles[task.status] || statusStyles.backlog;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    updateTask(task.id, { status: newStatus });
    await logTaskActivity(task.id, "status_changed", `Status changed to ${newStatus}`);
    setActivity(prev => [{ id: crypto.randomUUID(), task_id: task.id, action: "status_changed", details: `Status changed to ${newStatus}`, created_at: new Date().toISOString() }, ...prev]);
  };

  const handleAssigneeChange = async (newId: string) => {
    const assigneeId = newId || null;
    updateTask(task.id, { assigneeId });
    const agentName = newId ? agents.find(a => a.id === newId)?.name || "Unknown" : "Unassigned";
    await logTaskActivity(task.id, "assigned", `Assigned to ${agentName}`);
    setActivity(prev => [{ id: crypto.randomUUID(), task_id: task.id, action: "assigned", details: `Assigned to ${agentName}`, created_at: new Date().toISOString() }, ...prev]);
  };

  const handleDelete = () => {
    deleteTask(task.id);
    navigate("/tasks");
  };

  const handleArchive = () => {
    updateTask(task.id, { status: "done" as TaskStatus });
    navigate("/tasks");
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" }) +
        " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
    } catch { return dateStr; }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Build mock execution logs from activity
  const executionLogs = activity.map(a => {
    const ts = new Date(a.created_at).toISOString().replace("T", " ").slice(0, 19);
    return `[${ts}] ${a.action.toUpperCase()}\n${a.details || "No details"}`;
  }).join("\n\n") || `[${task.createdAt}] CREATED\n${task.title}\n\n${task.description}`;

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(executionLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find completed activity for "Completed" timestamp
  const completedEntry = activity.find(a => a.action === "completed" || (a.action === "status_changed" && a.details?.toLowerCase().includes("done")));

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Back link */}
        <button onClick={() => navigate("/tasks")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Left column — Agent & meta */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            {agent && (
              <div className="text-center">
                <img src={agent.image} alt={agent.name} className="h-40 w-40 mx-auto rounded-xl object-cover border border-border shadow-sm" />
                <h3 className="font-semibold text-foreground mt-3">{agent.name}</h3>
                <p className="text-sm text-muted-foreground">{agent.role}</p>
              </div>
            )}

            {/* Status dropdown */}
            <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
              <SelectTrigger className={`w-full ${ss.bg} ${ss.text} border-border/60 rounded-xl font-mono text-xs uppercase tracking-wider`}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${ss.dot}`} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="glass-panel-elevated border-border/60">
                {statusColumns.map(s => {
                  const sStyle = statusStyles[s.id] || statusStyles.backlog;
                  return (
                    <SelectItem
                      key={s.id}
                      value={s.id}
                      className="font-mono text-xs uppercase tracking-wider cursor-pointer focus:bg-primary/10 focus:text-primary"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${sStyle.dot}`} />
                        {s.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Assignee */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-1.5">Assigned To</label>
              <Select value={task.assigneeId || "_unassigned"} onValueChange={(v) => handleAssigneeChange(v === "_unassigned" ? "" : v)}>
                <SelectTrigger className="w-full border-border/60 rounded-xl bg-card">
                  <div className="flex items-center gap-3">
                    {agent ? (
                      <img src={agent.image} alt={agent.name} className="h-7 w-7 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-[10px] text-muted-foreground">?</span>
                      </div>
                    )}
                    <div className="text-left">
                      <SelectValue />
                      {agent && <p className="text-[10px] text-muted-foreground -mt-0.5">{agent.role}</p>}
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="glass-panel-elevated border-border/60">
                  <SelectItem value="_unassigned" className="cursor-pointer focus:bg-primary/10 focus:text-primary">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-secondary flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">?</span>
                      </div>
                      Unassigned
                    </div>
                  </SelectItem>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id} className="cursor-pointer focus:bg-primary/10 focus:text-primary">
                      <div className="flex items-center gap-2">
                        <img src={a.image} alt={a.name} className="h-6 w-6 rounded-lg object-cover" />
                        {a.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Meta info */}
            <div className="space-y-4 text-sm">
              {/* Scheduled For */}
              <div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Scheduled For</span>
                </div>
                <p className="text-foreground font-medium ml-6 mt-0.5">
                  {task.createdAt ? formatDate(task.createdAt) : "—"}
                </p>
              </div>

              {/* Created */}
              <div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Created</span>
                </div>
                <p className="text-foreground font-medium ml-6 mt-0.5">
                  {formatDate(task.createdAt)}
                </p>
              </div>

              {/* Completed */}
              {(task.status === "done" || completedEntry) && (
                <div>
                  <div className="flex items-center gap-2 text-success">
                    <Check className="h-4 w-4" />
                    <span>Completed</span>
                  </div>
                  <p className="text-success font-medium ml-6 mt-0.5">
                    {completedEntry ? formatDate(completedEntry.created_at) : formatDate(new Date().toISOString())}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-border">
              <button onClick={handleArchive} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Archive className="h-4 w-4" />
                Archive task
              </button>
              <button onClick={handleDelete} className="flex items-center gap-2 text-sm text-destructive/80 hover:text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
                Delete task
              </button>
            </div>
          </motion.div>

          {/* Right column — Details & Activity & Logs */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Title & scheduled date */}
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{task.title}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(task.createdAt)}</span>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div className="p-4 bg-card border border-border rounded-xl text-sm text-foreground/80 leading-relaxed">
                {task.description}
              </div>
            )}

            {/* Activity Log */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity</span>
              </div>
              <div className="p-4">
                {loadingActivity ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading activity...</p>
                ) : activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet</p>
                ) : (
                  <div className="space-y-5">
                    {activity.map(item => {
                      const icon = activityIcons[item.action] || { color: "text-muted-foreground", icon: "○" };
                      return (
                        <div key={item.id} className="flex items-start gap-3">
                          <span className={`text-lg mt-0.5 ${icon.color} leading-none`}>{icon.icon}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-foreground capitalize">{item.action.replace("_", " ")}</span>
                            {item.details && <p className="text-sm text-muted-foreground">{item.details}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.created_at)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Execution Logs */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setLogsOpen(!logsOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Execution Logs</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); handleCopyLogs(); }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 transition-colors"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  {logsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>
              <AnimatePresence>
                {logsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-border">
                      <pre className="mt-3 p-4 bg-secondary/50 rounded-xl text-xs font-mono text-foreground/80 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                        {executionLogs}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

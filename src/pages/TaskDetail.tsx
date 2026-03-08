import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, User2, ChevronDown, Trash2, Archive } from "lucide-react";
import { agents } from "@/data/agents";
import { statusColumns, type Task, type TaskStatus, type TaskPriority } from "@/data/tasks";
import { useTasks } from "@/hooks/use-tasks";
import { fetchTaskActivity, logTaskActivity } from "@/lib/api-extra";

const statusStyles: Record<string, { bg: string; text: string }> = {
  backlog: { bg: "bg-secondary", text: "text-muted-foreground" },
  todo: { bg: "bg-primary/10", text: "text-primary" },
  "in-progress": { bg: "bg-warning/10", text: "text-warning" },
  review: { bg: "bg-info/10", text: "text-info" },
  done: { bg: "bg-success/10", text: "text-success" },
};

const activityIcons: Record<string, string> = {
  created: "🔵",
  status_changed: "🟠",
  assigned: "👤",
  completed: "✅",
};

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { tasks, updateTask, deleteTask } = useTasks();
  const [activity, setActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

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

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

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
            <div>
              <div className="relative">
                <select
                  value={task.status}
                  onChange={e => handleStatusChange(e.target.value as TaskStatus)}
                  className={`w-full appearance-none ${ss.bg} ${ss.text} border border-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none cursor-pointer`}
                >
                  {statusColumns.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Assigned To</label>
              <div className="relative">
                <select
                  value={task.assigneeId || ""}
                  onChange={e => handleAssigneeChange(e.target.value)}
                  className="w-full appearance-none bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name} — {a.role}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
              </div>
            </div>

            {/* Meta info */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created</span>
              </div>
              <p className="text-foreground font-medium ml-6">{task.createdAt}</p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-border">
              <button onClick={handleDelete} className="flex items-center gap-2 text-sm text-destructive/80 hover:text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
                Delete task
              </button>
            </div>
          </motion.div>

          {/* Right column — Details & Activity */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Title & Description */}
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{task.title}</h1>
              {task.description && (
                <div className="mt-4 p-4 bg-card border border-border rounded-xl text-sm text-foreground/80 leading-relaxed">
                  {task.description}
                </div>
              )}
            </div>

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
                  <div className="space-y-4">
                    {activity.map(item => (
                      <div key={item.id} className="flex items-start gap-3">
                        <span className="text-base mt-0.5">{activityIcons[item.action] || "⚪"}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground capitalize">{item.action.replace("_", " ")}</span>
                          {item.details && <p className="text-sm text-muted-foreground">{item.details}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

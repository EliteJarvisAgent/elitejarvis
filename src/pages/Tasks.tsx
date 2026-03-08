import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, ChevronDown } from "lucide-react";
import { agents } from "@/data/agents";
import {
  initialTasks,
  statusColumns,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from "@/data/tasks";

const priorityStyle: Record<TaskPriority, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

const columnColors: Record<TaskStatus, string> = {
  backlog: "border-muted-foreground/30",
  todo: "border-primary/40",
  "in-progress": "border-warning/40",
  review: "border-info/40",
  done: "border-success/40",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");

  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDrop = (status: TaskStatus) => {
    if (!draggedTask) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === draggedTask ? { ...t, status } : t))
    );
    setDraggedTask(null);
  };

  const handleAssigneeChange = useCallback(
    (taskId: string, assigneeId: string | null) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, assigneeId } : t))
      );
    },
    []
  );

  const addTask = () => {
    if (!newTitle.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTitle,
      description: newDesc,
      status: "backlog",
      priority: newPriority,
      assigneeId: null,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setTasks((prev) => [...prev, task]);
    setNewTitle("");
    setNewDesc("");
    setNewPriority("medium");
    setShowNewTask(false);
  };

  const getAgentById = (id: string | null) =>
    id ? agents.find((a) => a.id === id) : null;

  return (
    <div className="p-6 lg:p-10 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Task Board</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Drag tasks between columns to update status. Assign agents from the dropdown.
          </p>
        </div>
        <button
          onClick={() => setShowNewTask(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/25 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {/* New task form */}
      <AnimatePresence>
        {showNewTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="glass-panel-elevated rounded-xl p-5 space-y-3">
              <input
                placeholder="Task title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-secondary/60 border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <textarea
                placeholder="Description (optional)..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full bg-secondary/60 border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
              />
              <div className="flex items-center gap-3">
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  className="bg-secondary/60 border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <button
                  onClick={addTask}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Add Task
                </button>
                <button
                  onClick={() => setShowNewTask(false)}
                  className="px-4 py-2 rounded-lg text-muted-foreground text-sm hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban columns */}
      <div className="flex-1 grid grid-cols-5 gap-4 min-h-0 overflow-x-auto">
        {statusColumns.map((col) => {
          const colTasks = getColumnTasks(col.id);
          return (
            <div
              key={col.id}
              className="flex flex-col min-w-[220px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl glass-panel mb-3 border-l-2 ${columnColors[col.id]}`}
              >
                <span className="text-xs font-mono-display uppercase tracking-widest text-foreground">
                  {col.label}
                </span>
                <span className="text-[10px] font-mono-display text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              {/* Task cards */}
              <div className="flex-1 space-y-2.5 overflow-y-auto scrollbar-thin pr-1">
                <AnimatePresence>
                  {colTasks.map((task) => {
                    const assignee = getAgentById(task.assigneeId);
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        className="glass-panel-elevated rounded-xl p-3.5 cursor-grab active:cursor-grabbing card-hover group"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-foreground leading-snug mb-1">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">
                                {task.description}
                              </p>
                            )}

                            {/* Priority badge */}
                            <span
                              className={`inline-block text-[9px] font-mono-display uppercase px-2 py-0.5 rounded-full border mb-2.5 ${priorityStyle[task.priority]}`}
                            >
                              {task.priority}
                            </span>

                            {/* Assignee dropdown */}
                            <div className="relative">
                              <select
                                value={task.assigneeId || ""}
                                onChange={(e) =>
                                  handleAssigneeChange(
                                    task.id,
                                    e.target.value || null
                                  )
                                }
                                className="w-full bg-secondary/50 border border-border/50 rounded-lg px-2.5 py-1.5 text-[11px] text-foreground appearance-none focus:outline-none focus:border-primary/50 pr-6"
                              >
                                <option value="">Unassigned</option>
                                {agents.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                            </div>

                            {/* Assignee avatar */}
                            {assignee && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <img
                                  src={assignee.image}
                                  alt={assignee.name}
                                  className="h-5 w-5 rounded-full object-cover bg-secondary"
                                />
                                <span className="text-[10px] text-muted-foreground font-mono-display">
                                  {assignee.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

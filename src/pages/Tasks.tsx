import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, ChevronDown, Circle, AlertTriangle, Flame, ArrowUp } from "lucide-react";
import { agents } from "@/data/agents";
import { statusColumns, type Task, type TaskStatus, type TaskPriority } from "@/data/tasks";
import { useTasks } from "@/hooks/use-tasks";

const priorityConfig: Record<TaskPriority, { style: string; icon: React.ReactNode }> = {
  critical: { style: "bg-destructive/15 text-destructive border-destructive/25", icon: <Flame className="h-2.5 w-2.5" /> },
  high: { style: "bg-warning/15 text-warning border-warning/25", icon: <AlertTriangle className="h-2.5 w-2.5" /> },
  medium: { style: "bg-primary/10 text-primary border-primary/20", icon: <ArrowUp className="h-2.5 w-2.5" /> },
  low: { style: "bg-secondary/80 text-muted-foreground border-border/50", icon: <Circle className="h-2.5 w-2.5" /> },
};

const columnAccent: Record<TaskStatus, { header: string; dropzone: string; dot: string }> = {
  backlog: { header: "border-b-muted-foreground/30", dropzone: "border-muted-foreground/15", dot: "bg-muted-foreground" },
  todo: { header: "border-b-primary/40", dropzone: "border-primary/15", dot: "bg-primary" },
  "in-progress": { header: "border-b-warning/40", dropzone: "border-warning/15", dot: "bg-warning" },
  review: { header: "border-b-info/40", dropzone: "border-info/15", dot: "bg-info" },
  done: { header: "border-b-success/40", dropzone: "border-success/15", dot: "bg-success" },
};

export default function TasksPage() {
  const { tasks, isLoading, addTask, updateTask } = useTasks();
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  // Mobile: selected column filter
  const [mobileCol, setMobileCol] = useState<TaskStatus | null>(null);

  const getColumnTasks = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  const handleDragStart = (taskId: string) => setDraggedTask(taskId);
  const handleDragEnd = () => { setDraggedTask(null); setDragOverCol(null); };

  const handleDrop = (status: TaskStatus) => {
    if (!draggedTask) return;
    updateTask(draggedTask, { status });
    setDraggedTask(null);
    setDragOverCol(null);
  };

  const handleAssigneeChange = useCallback(
    (taskId: string, assigneeId: string | null) => {
      updateTask(taskId, { assigneeId });
    },
    [updateTask]
  );

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    addTask({
      title: newTitle,
      description: newDesc,
      status: "backlog",
      priority: newPriority,
      assigneeId: null,
    });
    setNewTitle("");
    setNewDesc("");
    setNewPriority("medium");
    setShowNewTask(false);
  };

  const getAgentById = (id: string | null) => id ? agents.find((a) => a.id === id) : null;

  // Mobile: which columns to show
  const visibleColumns = mobileCol ? statusColumns.filter(c => c.id === mobileCol) : statusColumns;

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-4 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">Task Board</h1>
          <p className="text-muted-foreground text-xs mt-1 font-mono-display">
            {isLoading ? "Loading..." : `${tasks.length} tasks · ${tasks.filter((t) => t.status === "done").length} completed`}
          </p>
        </div>
        <button
          onClick={() => setShowNewTask(!showNewTask)}
          className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>

      <AnimatePresence>
        {showNewTask && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4 sm:mb-6">
            <div className="glass-panel rounded-xl p-4 space-y-3 border border-border/60">
              <input placeholder="Task title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus className="w-full bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
              <textarea placeholder="Description..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} className="w-full bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-all" />
              <div className="flex items-center gap-2">
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as TaskPriority)} className="bg-secondary/40 border border-border/40 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <div className="flex-1" />
                <button onClick={() => { setShowNewTask(false); setNewTitle(""); setNewDesc(""); }} className="px-3 py-1.5 rounded-lg text-muted-foreground text-xs hover:text-foreground transition-colors">Cancel</button>
                <button onClick={handleAddTask} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">Add</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile column filter tabs */}
      <div className="flex md:hidden gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setMobileCol(null)}
          className={`shrink-0 text-[10px] font-mono-display uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors ${
            !mobileCol ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground border-border/40"
          }`}
        >
          All ({tasks.length})
        </button>
        {statusColumns.map((col) => {
          const count = getColumnTasks(col.id).length;
          const accent = columnAccent[col.id];
          return (
            <button
              key={col.id}
              onClick={() => setMobileCol(col.id)}
              className={`shrink-0 flex items-center gap-1.5 text-[10px] font-mono-display uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors ${
                mobileCol === col.id ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground border-border/40"
              }`}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
              {col.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Board */}
      <div className={`flex-1 min-h-0 overflow-x-auto pb-2 ${
        mobileCol
          ? "flex flex-col"
          : "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3"
      }`}>
        {visibleColumns.map((col) => {
          const colTasks = getColumnTasks(col.id);
          const accent = columnAccent[col.id];
          const isOver = dragOverCol === col.id;

          return (
            <div key={col.id} className="flex flex-col min-w-0 md:min-w-[200px]" onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }} onDragLeave={() => setDragOverCol(null)} onDrop={() => handleDrop(col.id)}>
              <div className={`flex items-center gap-2 px-3 py-2 mb-2 border-b-2 ${accent.header}`}>
                <div className={`h-2 w-2 rounded-full ${accent.dot}`} />
                <span className="text-[11px] font-mono-display uppercase tracking-widest text-foreground/80 flex-1">{col.label}</span>
                <span className="text-[10px] font-mono-display text-muted-foreground/60">{colTasks.length}</span>
              </div>

              <div className={`flex-1 space-y-2 overflow-y-auto scrollbar-thin rounded-lg p-1.5 transition-colors duration-150 ${isOver ? `bg-secondary/40 border border-dashed ${accent.dropzone}` : "border border-transparent"}`}>
                <AnimatePresence>
                  {colTasks.map((task) => {
                    const assignee = getAgentById(task.assigneeId);
                    const priority = priorityConfig[task.priority];
                    const isDragging = draggedTask === task.id;

                    return (
                      <motion.div key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} draggable onDragStart={() => handleDragStart(task.id)} onDragEnd={handleDragEnd} className="bg-card/90 border border-border/40 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-border/70 transition-all duration-150 group">
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <h4 className="text-[13px] font-medium text-foreground leading-snug flex-1">{task.title}</h4>
                        </div>
                        {task.description && <p className="text-[11px] text-muted-foreground/70 line-clamp-2 mt-1.5 ml-5 leading-relaxed">{task.description}</p>}
                        <div className="flex items-center justify-between mt-3 ml-5">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-mono-display uppercase px-1.5 py-0.5 rounded border ${priority.style}`}>{priority.icon}{task.priority}</span>

                          {/* Mobile: status change select */}
                          <select
                            value={task.status}
                            onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
                            className="md:hidden bg-secondary/40 border border-border/40 rounded px-1.5 py-0.5 text-[9px] text-muted-foreground focus:outline-none"
                          >
                            {statusColumns.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>

                          <div className="relative">
                            {assignee ? (
                              <div className="flex items-center gap-1">
                                <img src={assignee.image} alt={assignee.name} className="h-5 w-5 rounded-full object-cover bg-secondary border border-border/50" />
                                <select value={task.assigneeId || ""} onChange={(e) => handleAssigneeChange(task.id, e.target.value || null)} className="absolute inset-0 w-full opacity-0 cursor-pointer">
                                  <option value="">Unassigned</option>
                                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                              </div>
                            ) : (
                              <div className="relative">
                                <div className="h-5 w-5 rounded-full bg-secondary/60 border border-dashed border-border/60 flex items-center justify-center"><Plus className="h-2.5 w-2.5 text-muted-foreground/50" /></div>
                                <select value="" onChange={(e) => handleAssigneeChange(task.id, e.target.value || null)} className="absolute inset-0 w-full opacity-0 cursor-pointer">
                                  <option value="">Unassigned</option>
                                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {colTasks.length === 0 && <div className="flex items-center justify-center h-20 text-[10px] font-mono-display text-muted-foreground/40 uppercase tracking-wider">Drop here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, Circle, AlertTriangle, Flame, ArrowUp, X, ChevronDown, User2, Pencil, Trash2 } from "lucide-react";
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

/* ── Styled Dropdown ── */
function StyledDropdown({
  value,
  options,
  onChange,
  trigger,
}: {
  value: string;
  options: { value: string; label: string; image?: string }[];
  onChange: (val: string) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="cursor-pointer"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl bg-card border border-border/60 shadow-xl shadow-black/30 backdrop-blur-xl overflow-hidden"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={(e) => { e.stopPropagation(); onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono transition-colors hover:bg-primary/10 ${
                  value === opt.value ? "bg-primary/15 text-primary" : "text-foreground/80"
                }`}
              >
                {opt.image && (
                  <img src={opt.image} alt={opt.label} className="h-5 w-5 rounded-full object-cover border border-border/40" />
                )}
                <span>{opt.label}</span>
                {value === opt.value && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Edit Task Modal ── */
function EditTaskModal({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Pick<Task, "title" | "description" | "status" | "priority" | "assigneeId">>) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || "");

  const handleSave = () => {
    onSave(task.id, {
      title,
      description: desc,
      status,
      priority,
      assigneeId: assigneeId || null,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-primary font-semibold">Edit Task</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/60 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Status</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full appearance-none bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 pr-8 text-xs text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  {statusColumns.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Priority</label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full appearance-none bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 pr-8 text-xs text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Assignee</label>
            <div className="relative">
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full appearance-none bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 pr-8 text-xs text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="">Unassigned</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border/40">
          <button
            onClick={() => { onDelete(task.id); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-destructive/80 hover:text-destructive hover:bg-destructive/10 text-xs font-mono transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-muted-foreground text-xs hover:text-foreground transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">Save</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Page ── */
export default function TasksPage() {
  const { tasks, isLoading, addTask, updateTask, deleteTask } = useTasks();
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
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
    addTask({ title: newTitle, description: newDesc, status: "backlog", priority: newPriority, assigneeId: null });
    setNewTitle(""); setNewDesc(""); setNewPriority("medium"); setShowNewTask(false);
  };

  const handleEditSave = useCallback(
    (id: string, updates: Partial<Pick<Task, "title" | "description" | "status" | "priority" | "assigneeId">>) => {
      updateTask(id, updates);
    },
    [updateTask]
  );

  const getAgentById = (id: string | null) => id ? agents.find((a) => a.id === id) : null;

  const assigneeOptions = [
    { value: "", label: "Unassigned" },
    ...agents.map((a) => ({ value: a.id, label: a.name, image: a.image })),
  ];

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
                <div className="relative">
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as TaskPriority)} className="appearance-none bg-secondary/40 border border-border/40 rounded-lg px-3 py-1.5 pr-7 text-xs text-foreground focus:outline-none focus:border-primary/50 cursor-pointer">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
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
        mobileCol ? "flex flex-col" : "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3"
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
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onDragEnd={handleDragEnd}
                        className="bg-card/90 border border-border/40 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-border/70 transition-all duration-150 group"
                      >
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <h4
                            className="text-[13px] font-medium text-foreground leading-snug flex-1 cursor-pointer hover:text-primary transition-colors"
                            onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                          >
                            {task.title}
                          </h4>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-secondary/60"
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                        {task.description && <p className="text-[11px] text-muted-foreground/70 line-clamp-2 mt-1.5 ml-5 leading-relaxed">{task.description}</p>}
                        <div className="flex items-center justify-between mt-3 ml-5">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-mono-display uppercase px-1.5 py-0.5 rounded border ${priority.style}`}>{priority.icon}{task.priority}</span>

                          {/* Mobile: status change */}
                          <div className="relative md:hidden">
                            <select
                              value={task.status}
                              onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
                              className="appearance-none bg-secondary/40 border border-border/40 rounded px-1.5 py-0.5 pr-5 text-[9px] text-muted-foreground focus:outline-none cursor-pointer"
                            >
                              {statusColumns.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground pointer-events-none" />
                          </div>

                          {/* Assignee dropdown */}
                          <StyledDropdown
                            value={task.assigneeId || ""}
                            options={assigneeOptions}
                            onChange={(val) => handleAssigneeChange(task.id, val || null)}
                            trigger={
                              assignee ? (
                                <img src={assignee.image} alt={assignee.name} className="h-5 w-5 rounded-full object-cover border border-border/50 hover:border-primary/50 transition-colors" />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-secondary/60 border border-dashed border-border/60 hover:border-primary/40 flex items-center justify-center transition-colors">
                                  <Plus className="h-2.5 w-2.5 text-muted-foreground/50" />
                                </div>
                              )
                            }
                          />
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

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTask && (
          <EditTaskModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={handleEditSave}
            onDelete={(id) => deleteTask?.(id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

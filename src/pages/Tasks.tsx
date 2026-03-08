import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, User2, Calendar, ChevronDown, X, Trash2, ExternalLink, Pause, Play, RefreshCw, FileText, Clock, Save } from "lucide-react";
import { agents } from "@/data/agents";
import { type Task, type TaskStatus, type TaskPriority } from "@/data/tasks";
import { useTasks } from "@/hooks/use-tasks";
import * as extraApi from "@/lib/api-extra";

type TabId = "tasks" | "templates" | "recurring" | "pre-instructions";

const tabs: { id: TabId; label: string }[] = [
  { id: "tasks", label: "Tasks" },
  { id: "templates", label: "Templates" },
  { id: "recurring", label: "Recurring" },
  { id: "pre-instructions", label: "Pre-instructions" },
];

/* ── Agent-grouped Task View ── */
function AgentTaskColumns({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (t: Task) => void }) {
  const agentGroups = agents.map(agent => ({
    agent,
    tasks: tasks.filter(t => t.assigneeId === agent.id),
  })).filter(g => g.tasks.length > 0);

  const unassigned = tasks.filter(t => !t.assigneeId);

  return (
    <div className="flex-1 overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-min px-1">
        {agentGroups.map(({ agent, tasks: agentTasks }) => (
          <div key={agent.id} className="w-[280px] shrink-0 flex flex-col">
            <div className="flex items-center gap-2 px-3 py-3 bg-card rounded-t-xl border border-border border-b-0">
              <img src={agent.image} alt={agent.name} className="h-6 w-6 rounded-full object-cover border border-border" />
              <span className="text-sm font-medium text-foreground flex-1">{agent.name}</span>
              <span className="text-xs text-muted-foreground">{agentTasks.length}</span>
            </div>
            <div className="flex-1 space-y-2 p-2 bg-secondary/30 rounded-b-xl border border-border border-t-0 min-h-[100px]">
              {agentTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="w-full text-left p-3 bg-card rounded-lg border border-border hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start gap-2">
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                      task.status === "done" ? "bg-success" :
                      task.status === "in-progress" ? "bg-warning" : "bg-muted-foreground"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-foreground block leading-snug">{task.title}</span>
                      {task.createdAt && (
                        <div className="flex items-center gap-1 mt-1.5 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span className="text-[11px]">{task.createdAt}</span>
                        </div>
                      )}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {unassigned.length > 0 && (
          <div className="w-[280px] shrink-0 flex flex-col">
            <div className="flex items-center gap-2 px-3 py-3 bg-card rounded-t-xl border border-border border-b-0">
              <User2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1">Unassigned</span>
              <span className="text-xs text-muted-foreground">{unassigned.length}</span>
            </div>
            <div className="flex-1 space-y-2 p-2 bg-secondary/30 rounded-b-xl border border-border border-t-0 min-h-[100px]">
              {unassigned.map(task => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="w-full text-left p-3 bg-card rounded-lg border border-border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-2">
                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 bg-muted-foreground`} />
                    <span className="text-sm text-foreground">{task.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Templates Tab ── */
function TemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    extraApi.fetchTemplates().then(d => { setTemplates(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const t = await extraApi.createTemplate({ title: newTitle, description: newDesc, assignee_id: newAssignee || null, priority: "medium" });
    if (t) setTemplates(prev => [t, ...prev]);
    setNewTitle(""); setNewDesc(""); setNewAssignee(""); setShowNew(false);
  };

  const handleDelete = async (id: string) => {
    await extraApi.deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const filtered = templates.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  const getAgent = (id: string | null) => id ? agents.find(a => a.id === id) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Templates</h2>
          <p className="text-sm text-muted-foreground">{templates.length} templates</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="p-4 bg-card border border-border rounded-xl space-y-3">
              <input placeholder="Template title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <textarea placeholder="Description..." value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              <div className="flex items-center gap-2">
                <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="">Unassigned</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <div className="flex-1" />
                <button onClick={() => setShowNew(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Create</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading templates...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(template => {
            const agent = getAgent(template.assignee_id);
            return (
              <div key={template.id} className="p-4 bg-card border border-border rounded-xl hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground">{template.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description || "No description"}</p>
                  </div>
                  <button onClick={() => handleDelete(template.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded text-destructive transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {agent && (
                  <div className="flex items-center gap-2 mt-3">
                    <img src={agent.image} alt={agent.name} className="h-5 w-5 rounded-full object-cover border border-border" />
                    <span className="text-xs text-muted-foreground">{agent.name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Recurring Tab ── */
function RecurringTab() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    extraApi.fetchRecurringSchedules().then(d => { setSchedules(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await extraApi.updateRecurringSchedule(id, { is_active: !current });
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s));
  };

  const handleDelete = async (id: string) => {
    await extraApi.deleteRecurringSchedule(id);
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Recurring Schedules</h2>
        <p className="text-sm text-muted-foreground">{schedules.length} schedules · {schedules.filter(s => s.is_active).length} active</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading schedules...</p>
      ) : schedules.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No recurring schedules yet. Create a template first, then set up a schedule.</p>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {schedules.map(schedule => (
            <div key={schedule.id} className="flex items-center gap-4 px-4 py-3">
              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${schedule.is_active ? "bg-success" : "bg-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block">{schedule.title}</span>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" />{schedule.frequency}</span>
                  {schedule.next_run && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Next: {new Date(schedule.next_run).toLocaleDateString()}</span>}
                </div>
              </div>
              <button onClick={() => toggleActive(schedule.id, schedule.is_active)} className="p-1.5 rounded-lg hover:bg-secondary text-warning transition-colors">
                {schedule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button onClick={() => handleDelete(schedule.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Pre-instructions Tab ── */
function PreInstructionsTab() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    extraApi.fetchPreInstructions().then(d => { if (d) setContent(d.content); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await extraApi.savePreInstructions(content);
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Pre-instructions</h2>
        <p className="text-sm text-muted-foreground mt-1">These instructions are prepended to every task before it is dispatched to an agent. Supports line breaks and Markdown text.</p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={12}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
            placeholder="Enter pre-instructions..."
          />
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── New Task Modal ── */
function NewTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Omit<Task, "id" | "createdAt">) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState<TaskStatus>("backlog");

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({ title, description: desc, status, priority, assigneeId: assignee || null });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">New Task</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Title <span className="text-destructive">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Assign To</label>
            <select value={assignee} onChange={e => setAssignee(e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none">
              <option value="">Unassigned</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name} — {a.role}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleAdd} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Create Task</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Tasks Page ── */
export default function TasksPage() {
  const { tasks, isLoading, addTask, updateTask, deleteTask } = useTasks();
  const [activeTab, setActiveTab] = useState<TabId>("tasks");
  const [search, setSearch] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const navigate = useNavigate();

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const activeTasks = tasks.filter(t => t.status !== "done");

  const handleTaskClick = (task: Task) => {
    navigate(`/tasks/${task.id}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.id === "tasks" && <span className="ml-1.5 text-xs text-muted-foreground">{tasks.length}</span>}
          </button>
        ))}
      </div>

      {activeTab === "tasks" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading..." : `${activeTasks.length} active · ${tasks.length} total`}
              </p>
            </div>
            <button onClick={() => setShowNewTask(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {/* Agent-grouped columns */}
          <AgentTaskColumns tasks={filteredTasks} onTaskClick={handleTaskClick} />
        </div>
      )}

      {activeTab === "templates" && <div className="flex-1 overflow-y-auto"><TemplatesTab /></div>}
      {activeTab === "recurring" && <div className="flex-1 overflow-y-auto"><RecurringTab /></div>}
      {activeTab === "pre-instructions" && <div className="flex-1 overflow-y-auto"><PreInstructionsTab /></div>}

      <AnimatePresence>
        {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} onAdd={addTask} />}
      </AnimatePresence>
    </div>
  );
}

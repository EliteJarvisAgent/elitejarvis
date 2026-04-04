"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Clock, Loader2, Bot, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-safe-client";
import { api } from "@/lib/backend-client";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string | null;
  created_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-900 text-red-200",
  high:     "bg-orange-900 text-orange-200",
  medium:   "bg-yellow-900 text-yellow-200",
  low:      "bg-slate-700 text-slate-300",
};

const STATUS_COLORS: Record<string, string> = {
  done:          "bg-green-900 text-green-200",
  "in-progress": "bg-blue-900 text-blue-200",
  todo:          "bg-slate-700 text-slate-300",
  review:        "bg-purple-900 text-purple-200",
};

function parseTaskSections(description: string) {
  const parts = description || "";
  const original   = parts.split(/\n\n--- Jarvis (log|result|error) ---/)[0]?.trim() || "";
  const resultMatch = parts.match(/--- Jarvis result ---\n([\s\S]*?)(?:\n\n--- Jarvis log ---|$)/);
  const logMatch    = parts.match(/--- Jarvis log ---\n([\s\S]*)$/);
  const errorMatch  = parts.match(/--- Jarvis error ---\n([\s\S]*?)(?:\n\n---|$)/);
  return {
    original,
    result: resultMatch?.[1]?.trim() || null,
    log:    logMatch?.[1]?.trim()    || null,
    error:  errorMatch?.[1]?.trim()  || null,
  };
}

export default function TasksPage() {
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [loading, setLoading]           = useState(true);
  const [creating, setCreating]         = useState(false);
  const [newTitle, setNewTitle]         = useState("");
  const [newDesc, setNewDesc]           = useState("");
  const [newPriority, setNewPriority]   = useState("medium");
  const [assignToJarvis, setAssignToJarvis] = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // ── Load tasks ──────────────────────────────────────────────────────────────
  const loadTasks = async () => {
    try {
      const data = await api.fetchTasks();
      setTasks(data);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  // ── Supabase realtime — live updates while Jarvis works ────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("tasks-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "UPDATE") {
          setTasks((prev) => prev.map((t) => t.id === payload.new.id ? { ...t, ...payload.new } : t));
        } else if (payload.eventType === "INSERT") {
          setTasks((prev) => [payload.new as Task, ...prev]);
        } else if (payload.eventType === "DELETE") {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Create task ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await api.createTask({
        title: newTitle.trim(),
        description: newDesc.trim(),
        status: "todo",
        priority: newPriority,
        assignee_id: assignToJarvis ? "jarvis" : null,
      });

      toast.success(assignToJarvis ? "Sent to Jarvis — he's on it" : "Task created");
      setNewTitle("");
      setNewDesc("");
      setNewPriority("medium");
      setAssignToJarvis(false);
      setShowForm(false);
    } catch {
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  // ── Manually send existing task to Jarvis ───────────────────────────────────
  const sendToJarvis = async (task: Task) => {
    await api.updateTask(task.id, { assignee_id: "jarvis", status: "todo" });
    toast.info(`Jarvis is picking it up...`);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await api.updateTask(id, { status });
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  };

  const toggleLog = (id: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  const TaskCard = ({ task }: { task: Task }) => {
    const { original, result, log, error } = parseTaskSections(task.description);
    const isWorking = task.status === "in-progress" && task.assignee_id === "jarvis";
    const logExpanded = expandedLogs.has(task.id);

    return (
      <Card className={`border transition-all ${isWorking ? "border-blue-500 shadow-lg shadow-blue-900/20" : "bg-slate-900 border-slate-700 hover:border-slate-600"} bg-slate-900`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">

              {/* Title + Jarvis badge */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className="font-medium text-white">{task.title}</p>
                {task.assignee_id === "jarvis" && (
                  <span className="flex items-center gap-1 text-xs text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-800">
                    <Bot size={10} /> Jarvis
                  </span>
                )}
              </div>

              {/* Original description */}
              {original && <p className="text-sm text-slate-400 mb-2">{original}</p>}

              {/* Working indicator */}
              {isWorking && (
                <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
                  <Loader2 size={13} className="animate-spin" />
                  Working on it...
                </div>
              )}

              {/* Live log */}
              {log && (
                <div className="mt-2 mb-2">
                  <button
                    onClick={() => toggleLog(task.id)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-1 transition-colors"
                  >
                    {logExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {isWorking ? "Live log" : "Execution log"}
                  </button>
                  {logExpanded && (
                    <div className="bg-slate-950 rounded p-3 font-mono text-xs text-slate-400 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap border border-slate-800">
                      {log}
                    </div>
                  )}
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="mt-2 mb-2 bg-green-950/30 border border-green-900/50 rounded-lg p-3">
                  <p className="text-xs text-green-400 font-semibold mb-1">✅ Jarvis completed this</p>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{result}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-2 mb-2 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                  <p className="text-xs text-red-400 font-semibold mb-1">Error</p>
                  <p className="text-sm text-red-300 font-mono">{error}</p>
                </div>
              )}

              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <Badge className={STATUS_COLORS[task.status] || "bg-slate-700 text-slate-300"}>
                  {task.status}
                </Badge>
                <Badge className={PRIORITY_COLORS[task.priority] || "bg-slate-700 text-slate-300"}>
                  {task.priority}
                </Badge>
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <Clock size={11} />
                  {new Date(task.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            {task.status !== "done" && !isWorking && (
              <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                {task.assignee_id !== "jarvis" && (
                  <Button
                    size="sm"
                    className="bg-blue-700 hover:bg-blue-600 text-white text-xs gap-1 whitespace-nowrap"
                    onClick={() => sendToJarvis(task)}
                  >
                    <Bot size={13} /> Send to Jarvis
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-green-400 hover:text-green-300 hover:bg-green-900/30 text-xs"
                  onClick={() => handleStatusChange(task.id, "done")}
                >
                  Mark done
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            )}

            {task.status === "done" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-900/30 flex-shrink-0"
                onClick={() => handleDelete(task.id)}
              >
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-slate-400">{open.length} open · {done.length} done · live updates</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 mt-2" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} className="mr-2" /> New Task
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="bg-slate-900 border-blue-800">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-white font-semibold text-lg">New Task</h2>
            <Input
              placeholder='e.g. "Build a landing page for Elite Exteriors" or "Research top roofing competitors in Louisville"'
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              autoFocus
            />
            <Input
              placeholder="Extra details — more context = better results from Jarvis"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-slate-400 text-sm">Priority:</span>
              {["low", "medium", "high", "critical"].map((p) => (
                <button key={p} onClick={() => setNewPriority(p)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${newPriority === p ? PRIORITY_COLORS[p] + " ring-2 ring-white/30" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
                >{p}</button>
              ))}
            </div>

            {/* Jarvis toggle */}
            <div
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${assignToJarvis ? "border-blue-500 bg-blue-900/20" : "border-slate-700 bg-slate-800 hover:border-slate-600"}`}
              onClick={() => setAssignToJarvis((v) => !v)}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${assignToJarvis ? "bg-blue-600" : "bg-slate-700"}`}>
                {assignToJarvis && <Zap size={12} className="text-white" />}
              </div>
              <div>
                <p className="text-sm font-medium text-white">Have Jarvis do this</p>
                <p className="text-xs text-slate-400">He'll execute it autonomously — research, build, write, deploy. Watch it happen live.</p>
              </div>
              <Bot size={20} className={`ml-auto flex-shrink-0 ${assignToJarvis ? "text-blue-400" : "text-slate-600"}`} />
            </div>

            <div className="flex gap-2">
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                {creating ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                {assignToJarvis ? "Create & Send to Jarvis" : "Create Task"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="open" className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="done">Done ({done.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-3">
          {open.length === 0
            ? <p className="text-slate-500 text-center py-16">No open tasks — create one above.</p>
            : open.map((t) => <TaskCard key={t.id} task={t} />)
          }
        </TabsContent>

        <TabsContent value="done" className="space-y-3">
          {done.length === 0
            ? <p className="text-slate-500 text-center py-16">No completed tasks yet.</p>
            : done.map((t) => <TaskCard key={t.id} task={t} />)
          }
        </TabsContent>
      </Tabs>
    </div>
  );
}

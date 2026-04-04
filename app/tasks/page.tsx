"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Clock, Loader2, Bot, Zap } from "lucide-react";
import { toast } from "sonner";
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
  high: "bg-orange-900 text-orange-200",
  medium: "bg-yellow-900 text-yellow-200",
  low: "bg-slate-700 text-slate-300",
};

const STATUS_COLORS: Record<string, string> = {
  done: "bg-green-900 text-green-200",
  "in-progress": "bg-blue-900 text-blue-200",
  todo: "bg-slate-700 text-slate-300",
  review: "bg-purple-900 text-purple-200",
  backlog: "bg-slate-800 text-slate-400",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [assignToJarvis, setAssignToJarvis] = useState(false);
  const [showForm, setShowForm] = useState(false);

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

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const task = await api.createTask({
        title: newTitle.trim(),
        description: newDesc.trim(),
        status: "todo",
        priority: newPriority,
        assignee_id: null,
      });

      toast.success("Task created");
      setNewTitle("");
      setNewDesc("");
      setNewPriority("medium");
      setShowForm(false);
      await loadTasks();

      // If "assign to Jarvis" is checked, immediately execute
      if (assignToJarvis && task?.id) {
        setAssignToJarvis(false);
        setTimeout(() => handleExecute(task.id, task.title), 500);
      }
    } catch {
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleExecute = async (taskId: string, taskTitle: string) => {
    setExecutingId(taskId);
    toast.info(`Jarvis is working on "${taskTitle}"...`);

    try {
      const res = await fetch("/api/jarvis/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      if (data.success) {
        toast.success(`Done! Check Telegram for results.`);
        await loadTasks();
      } else {
        toast.error("Jarvis encountered an issue: " + (data.error || "unknown"));
      }
    } catch (err: any) {
      toast.error("Failed to execute: " + err.message);
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateTask(id, { status });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    } catch {
      toast.error("Failed to update");
    }
  };

  const byStatus = (s: string) => tasks.filter((t) => t.status === s);
  const open = tasks.filter((t) => t.status !== "done");
  const done = byStatus("done");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-slate-400">{open.length} open · {done.length} done</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 mt-2" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} className="mr-2" />
          New Task
        </Button>
      </div>

      {/* Create Task Form */}
      {showForm && (
        <Card className="bg-slate-900 border-blue-800">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-white font-semibold text-lg">Create Task</h2>
            <Input
              placeholder="What needs to be done? *"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              autoFocus
            />
            <Input
              placeholder="Details — the more you give Jarvis, the better he can do it"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-slate-400 text-sm">Priority:</span>
              {["low", "medium", "high", "critical"].map((p) => (
                <button
                  key={p}
                  onClick={() => setNewPriority(p)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    newPriority === p ? PRIORITY_COLORS[p] + " ring-2 ring-white/30" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Assign to Jarvis toggle */}
            <div
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                assignToJarvis ? "border-blue-500 bg-blue-900/20" : "border-slate-700 bg-slate-800 hover:border-slate-600"
              }`}
              onClick={() => setAssignToJarvis((v) => !v)}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${assignToJarvis ? "bg-blue-600" : "bg-slate-700"}`}>
                {assignToJarvis && <Zap size={12} className="text-white" />}
              </div>
              <div>
                <p className="text-sm font-medium text-white">Have Jarvis do this automatically</p>
                <p className="text-xs text-slate-400">He'll research, draft, or execute it and send results to your Telegram</p>
              </div>
              <Bot size={20} className={`ml-auto flex-shrink-0 ${assignToJarvis ? "text-blue-400" : "text-slate-600"}`} />
            </div>

            <div className="flex gap-2">
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
              >
                {creating ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                {assignToJarvis ? "Create & Send to Jarvis" : "Create Task"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="open" className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="done">Done ({done.length})</TabsTrigger>
        </TabsList>

        {[
          { value: "open", tasks: open },
          { value: "done", tasks: done },
        ].map(({ value, tasks: filtered }) => (
          <TabsContent key={value} value={value} className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-center py-16">
                {value === "done" ? "No completed tasks yet." : "No open tasks — create one above."}
              </p>
            ) : (
              filtered.map((task) => {
                const isExecuting = executingId === task.id;
                const isJarvisTask = task.assignee_id === "jarvis";
                const hasResult = task.description?.includes("--- Jarvis result ---");

                return (
                  <Card
                    key={task.id}
                    className={`border transition-colors ${isExecuting ? "border-blue-500 bg-slate-900" : "bg-slate-900 border-slate-700 hover:border-slate-600"}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-white">{task.title}</p>
                            {isJarvisTask && (
                              <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full">
                                <Bot size={10} /> Jarvis
                              </span>
                            )}
                          </div>

                          {/* Show task description / Jarvis result */}
                          {task.description && !hasResult && (
                            <p className="text-sm text-slate-400 mb-2">{task.description}</p>
                          )}
                          {hasResult && (
                            <div className="mt-2 mb-3">
                              <p className="text-xs text-blue-400 font-medium mb-1">Jarvis result:</p>
                              <p className="text-sm text-slate-300 leading-relaxed">
                                {task.description.split("--- Jarvis result ---")[1]?.trim().slice(0, 300)}
                                {task.description.split("--- Jarvis result ---")[1]?.trim().length > 300 && "…"}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={STATUS_COLORS[task.status] || "bg-slate-700 text-slate-300"}>
                              {isExecuting ? "⚡ working..." : task.status}
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

                        {/* Actions */}
                        <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                          {task.status !== "done" && !isExecuting && (
                            <Button
                              size="sm"
                              className="bg-blue-700 hover:bg-blue-600 text-white text-xs gap-1"
                              onClick={() => handleExecute(task.id, task.title)}
                            >
                              <Bot size={13} />
                              Send to Jarvis
                            </Button>
                          )}
                          {isExecuting && (
                            <div className="flex items-center gap-2 text-blue-400 text-xs">
                              <Loader2 size={13} className="animate-spin" />
                              Working...
                            </div>
                          )}
                          {task.status !== "done" && !isExecuting && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300 hover:bg-green-900/30 text-xs"
                              onClick={() => handleStatusChange(task.id, "done")}
                            >
                              Mark done
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                            onClick={() => handleDelete(task.id)}
                            disabled={isExecuting}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

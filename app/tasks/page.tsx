"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend-client";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
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
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
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
      await api.createTask({
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
    } catch {
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateTask(id, { status });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update task");
    }
  };

  const byStatus = (s: string) => tasks.filter((t) => t.status === s);

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
          <p className="text-slate-400">{tasks.length} task{tasks.length !== 1 ? "s" : ""} total</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 mt-2"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus size={16} className="mr-2" />
          New Task
        </Button>
      </div>

      {/* Create Task Form */}
      {showForm && (
        <Card className="bg-slate-900 border-slate-600">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-white font-semibold text-lg">Create Task</h2>
            <Input
              placeholder="Task title *"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
            <Input
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
            <div className="flex gap-2 flex-wrap">
              {["low", "medium", "high", "critical"].map((p) => (
                <button
                  key={p}
                  onClick={() => setNewPriority(p)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    newPriority === p
                      ? PRIORITY_COLORS[p] + " ring-2 ring-white/30"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
              >
                {creating ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                Create
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({byStatus("in-progress").length + byStatus("todo").length})</TabsTrigger>
          <TabsTrigger value="done">Done ({byStatus("done").length})</TabsTrigger>
        </TabsList>

        {["all", "active", "done"].map((tab) => {
          const filtered =
            tab === "all" ? tasks :
            tab === "active" ? [...byStatus("todo"), ...byStatus("in-progress"), ...byStatus("review")] :
            byStatus("done");

          return (
            <TabsContent key={tab} value={tab} className="space-y-3">
              {filtered.length === 0 ? (
                <p className="text-slate-500 text-center py-12">
                  {tab === "done" ? "No completed tasks yet." : "No tasks yet — create one above."}
                </p>
              ) : (
                filtered.map((task) => (
                  <Card key={task.id} className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white mb-1 truncate">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-slate-400 mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={STATUS_COLORS[task.status] || "bg-slate-700 text-slate-300"}>
                              {task.status}
                            </Badge>
                            <Badge className={PRIORITY_COLORS[task.priority] || "bg-slate-700 text-slate-300"}>
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-slate-600 flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(task.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {task.status !== "done" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300 hover:bg-green-900/30 text-xs"
                              onClick={() => handleStatusChange(task.id, "done")}
                            >
                              Mark done
                            </Button>
                          )}
                          {task.status === "todo" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 text-xs"
                              onClick={() => handleStatusChange(task.id, "in-progress")}
                            >
                              Start
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

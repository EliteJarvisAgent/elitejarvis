// Custom backend integration
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/backend-client";
import type { Task, TaskStatus, TaskPriority } from "@/data/tasks";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.fetchTasks();
        if (Array.isArray(data)) {
          setTasks(
            data.map((t: any) => ({
              id: String(t.id),
              title: t.title,
              description: t.description || "",
              status: (t.status || "backlog") as TaskStatus,
              priority: (t.priority || "medium") as TaskPriority,
              assigneeId: t.assignee_id || t.assigned_agent || null,
              createdAt: t.created_at?.split("T")[0] ?? "",
            }))
          );
        }
      } catch (err) {
        console.warn("Tasks load failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Poll for updates every 5s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await api.fetchTasks();
        if (Array.isArray(data)) {
          setTasks(
            data.map((t: any) => ({
              id: String(t.id),
              title: t.title,
              description: t.description || "",
              status: (t.status || "backlog") as TaskStatus,
              priority: (t.priority || "medium") as TaskPriority,
              assigneeId: t.assignee_id || t.assigned_agent || null,
              createdAt: t.created_at?.split("T")[0] ?? "",
            }))
          );
        }
      } catch {
        // silent retry
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const addTask = useCallback(
    async (task: Omit<Task, "id" | "createdAt">) => {
      try {
        const data = await api.createTask({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignee_id: task.assigneeId,
        });
        if (data) {
          const newTask: Task = {
            id: String(data.id),
            title: data.title,
            description: data.description || "",
            status: data.status as TaskStatus,
            priority: data.priority as TaskPriority,
            assigneeId: data.assignee_id || data.assigned_agent || null,
            createdAt: data.created_at?.split("T")[0] ?? "",
          };
          setTasks((prev) => {
            if (prev.some((p) => p.id === newTask.id)) return prev;
            return [...prev, newTask];
          });
        }
      } catch (err) {
        console.warn("Add task failed:", err);
      }
    },
    []
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Pick<Task, "status" | "assigneeId" | "title" | "description" | "priority">>) => {
      const dbUpdates: any = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

      // Optimistic update
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

      try {
        await api.updateTask(id, dbUpdates);
      } catch (err) {
        console.warn("Update task failed:", err);
      }
    },
    []
  );

  const deleteTask = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      try {
        await api.deleteTask(id);
      } catch (err) {
        console.warn("Delete task failed:", err);
      }
    },
    []
  );

  return { tasks, isLoading, addTask, updateTask, deleteTask };
}

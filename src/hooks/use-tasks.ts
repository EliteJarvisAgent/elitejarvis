// Supabase Cloud backend integration
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Task, TaskStatus, TaskPriority } from "@/data/tasks";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks on mount
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: true });

      if (data) {
        setTasks(
          data.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status as TaskStatus,
            priority: t.priority as TaskPriority,
            assigneeId: t.assignee_id,
            createdAt: t.created_at?.split("T")[0] ?? "",
          }))
        );
      }
      setIsLoading(false);
    };
    load();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const t = payload.new as any;
            setTasks((prev) => {
              if (prev.some((p) => p.id === t.id)) return prev;
              return [
                ...prev,
                {
                  id: t.id,
                  title: t.title,
                  description: t.description,
                  status: t.status,
                  priority: t.priority,
                  assigneeId: t.assignee_id,
                  createdAt: t.created_at?.split("T")[0] ?? "",
                },
              ];
            });
          } else if (payload.eventType === "UPDATE") {
            const t = payload.new as any;
            setTasks((prev) =>
              prev.map((p) =>
                p.id === t.id
                  ? {
                      ...p,
                      title: t.title,
                      description: t.description,
                      status: t.status,
                      priority: t.priority,
                      assigneeId: t.assignee_id,
                    }
                  : p
              )
            );
          } else if (payload.eventType === "DELETE") {
            const t = payload.old as any;
            setTasks((prev) => prev.filter((p) => p.id !== t.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addTask = useCallback(
    async (task: Omit<Task, "id" | "createdAt">) => {
      const { data } = await supabase
        .from("tasks")
        .insert({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignee_id: task.assigneeId,
        })
        .select()
        .single();

      if (data) {
        setTasks((prev) => {
          if (prev.some((p) => p.id === data.id)) return prev;
          return [
            ...prev,
            {
              id: data.id,
              title: data.title,
              description: data.description,
              status: data.status as TaskStatus,
              priority: data.priority as TaskPriority,
              assigneeId: data.assignee_id,
              createdAt: data.created_at?.split("T")[0] ?? "",
            },
          ];
        });
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

      await supabase.from("tasks").update(dbUpdates).eq("id", id);
    },
    []
  );

  return { tasks, isLoading, addTask, updateTask };
}

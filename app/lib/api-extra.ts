// Backend API for templates, recurring schedules, activity, and pre-instructions
import { supabase } from "@/lib/supabase-safe-client";

// Task Templates
export async function fetchTemplates() {
  const { data, error } = await supabase.from("task_templates").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createTemplate(template: { title: string; description: string; assignee_id: string | null; priority: string }) {
  const { data, error } = await supabase.from("task_templates").insert(template).select().single();
  if (error) throw error;
  return data;
}

export async function updateTemplate(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from("task_templates").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from("task_templates").delete().eq("id", id);
  if (error) throw error;
}

// Recurring Schedules
export async function fetchRecurringSchedules() {
  const { data, error } = await supabase.from("recurring_schedules").select("*, task_templates(title, assignee_id)").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createRecurringSchedule(schedule: { template_id: string; title: string; frequency: string; schedule_time: string; schedule_days: string[]; next_run: string | null }) {
  const { data, error } = await supabase.from("recurring_schedules").insert(schedule).select().single();
  if (error) throw error;
  return data;
}

export async function updateRecurringSchedule(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from("recurring_schedules").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRecurringSchedule(id: string) {
  const { error } = await supabase.from("recurring_schedules").delete().eq("id", id);
  if (error) throw error;
}

// Task Activity
export async function fetchTaskActivity(taskId: string) {
  const { data, error } = await supabase.from("task_activity").select("*").eq("task_id", taskId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function logTaskActivity(taskId: string, action: string, details: string = "") {
  const { error } = await supabase.from("task_activity").insert({ task_id: taskId, action, details });
  if (error) console.warn("Activity log failed:", error);
}

// Pre-instructions
export async function fetchPreInstructions() {
  const { data, error } = await supabase.from("pre_instructions").select("*").limit(1).single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function savePreInstructions(content: string) {
  // Upsert: check if exists first
  const existing = await fetchPreInstructions();
  if (existing) {
    const { error } = await supabase.from("pre_instructions").update({ content, updated_at: new Date().toISOString() }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("pre_instructions").insert({ content });
    if (error) throw error;
  }
}

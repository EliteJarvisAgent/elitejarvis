// API client — uses Lovable Cloud database directly
import { supabase } from "@/lib/supabase-safe-client";

const PROJECT_ID = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || "blpkggmfpxrjvcoclssq";
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CLOUD_URL = `https://${PROJECT_ID}.supabase.co`;

export const api = {
  fetchTasks: async () => {
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  createTask: async (task: { title: string; description: string; status: string; priority: string; assignee_id: string | null }) => {
    const { data, error } = await supabase.from("tasks").insert(task).select().single();
    if (error) throw error;
    return data;
  },

  updateTask: async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  deleteTask: async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
  },

  fetchMessages: async () => {
    const { data, error } = await supabase.from("messages").select("*").order("timestamp", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  createMessage: async (msg: { sender: string; text: string }) => {
    const { data, error } = await supabase.from("messages").insert(msg).select().single();
    if (error) throw error;
    return data;
  },

  askJarvis: async (messages: { role: string; content: string }[]) => {
    const res = await fetch(`${CLOUD_URL}/functions/v1/jarvis-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: API_KEY || "", Authorization: `Bearer ${API_KEY || ""}` },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(`Jarvis error: ${res.status}`);
    return res.json();
  },

  googleTTS: async (text: string) => {
    const res = await fetch(`${CLOUD_URL}/functions/v1/google-tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: API_KEY || "", Authorization: `Bearer ${API_KEY || ""}` },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`TTS error: ${res.status}`);
    return res.json();
  },
};

export const API_BASE_URL = CLOUD_URL;

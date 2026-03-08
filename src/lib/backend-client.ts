// API client — routes through edge function proxy to avoid mixed content (HTTPS→HTTP)
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "blpkggmfpxrjvcoclssq";
const PROXY_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/api-proxy`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function proxy(endpoint: string, method = "GET", body?: unknown) {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ endpoint, method, body }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Proxy error (${res.status}): ${err}`);
  }
  return res.json();
}

export const api = {
  fetchTasks: () => proxy("/api/tasks"),
  createTask: (task: { title: string; description: string; status: string; priority: string; assignee_id: string | null }) =>
    proxy("/api/tasks", "POST", task),
  updateTask: (id: string, updates: Record<string, unknown>) =>
    proxy(`/api/tasks/${id}`, "PATCH", updates),
  deleteTask: (id: string) =>
    proxy(`/api/tasks/${id}`, "DELETE"),

  fetchMessages: () => proxy("/api/messages"),
  createMessage: (msg: { sender: string; text: string }) =>
    proxy("/api/messages", "POST", msg),

  askJarvis: (messages: { role: string; content: string }[]) =>
    proxy("/api/jarvis-chat", "POST", { messages }),

  googleTTS: (text: string) =>
    proxy("/api/google-tts", "POST", { text }),
};

export const API_BASE_URL = PROXY_URL;

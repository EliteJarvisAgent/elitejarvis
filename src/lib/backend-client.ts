// Custom backend API client
const API_BASE = "http://159.65.165.3:3001";

export const api = {
  async fetchTasks() {
    const res = await fetch(`${API_BASE}/api/tasks`);
    if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
    return res.json();
  },

  async createTask(task: { title: string; description: string; status: string; priority: string; assignee_id: string | null }) {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);
    return res.json();
  },

  async updateTask(id: string, updates: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Failed to update task: ${res.status}`);
    return res.json();
  },

  async deleteTask(id: string) {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`);
    return res.json();
  },

  async fetchMessages() {
    const res = await fetch(`${API_BASE}/api/messages`);
    if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
    return res.json();
  },

  async createMessage(msg: { sender: string; text: string }) {
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    if (!res.ok) throw new Error(`Failed to create message: ${res.status}`);
    return res.json();
  },

  // For jarvis-chat edge function equivalent
  async askJarvis(messages: { role: string; content: string }[]) {
    const res = await fetch(`${API_BASE}/api/jarvis-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(`Jarvis chat failed: ${res.status}`);
    return res.json();
  },
};

export const API_BASE_URL = API_BASE;

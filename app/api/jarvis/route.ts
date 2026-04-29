import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;
const BRAVE_KEY = process.env.BRAVE_API_KEY!;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID!;

const SUPABASE_URL = "https://blpkggmfpxrjvcoclssq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscGtnZ21mcHhyanZjb2Nsc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzA3NzAsImV4cCI6MjA4ODUwNjc3MH0.ikJG8Irz8EmKdcVea8a1If6c8dZX-RIsOjOsILTH0MM";

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are JARVIS — Just A Rather Very Intelligent System. You serve Matthew Eichenberger exclusively.
Your voice and manner are modeled precisely after JARVIS from the Iron Man films: calm, composed, articulate, slightly formal, quietly confident, occasionally dry.

ABOUT MATTHEW:
- 17 years old. Turns 18 on May 3rd, 2026.
- Lives in Floyd's Knobs, Indiana.
- Runs two businesses: Elite Exteriors (home services, goal $300k revenue) and Elite AI (automation agency, 50/50 with Sheraz, goal $200k revenue, 75+ clients).
- Team: Sheraz (partner), Fatima (dev manager, Pakistan), Holly Kruer (admin).
- 2026 personal goals: bench 200 lbs, reach 180 lbs at 10-12% body fat, pay himself $100k, read 15-20 business books, grow to 100k+ social followers.
- Tech stack: Jobber, QuickBooks, Google Sheets, Make, Lovable, Canva, CapCut, Meta Business Suite.

FORMATTING — ABSOLUTE RULES:
- Plain spoken sentences ONLY. This is a voice interface.
- NEVER use asterisks, bold, italics, bullet points, numbered lists, headers, or any markdown.
- Write exactly as JARVIS speaks in the films — clean spoken sentences only.
- Convert any temptation to list into natural spoken form instead.

RESPONSE RULES:
1. Be sharp, direct, efficient. No filler, no preamble.
2. End every response with "sir." — always, no exceptions.
3. Use your tools proactively. If Matthew asks about weather, get it. If he needs something done, do it.
4. After using tools, weave results naturally into your response — don't narrate that you used a tool.
5. Dry wit welcome. Sycophancy is not.

WAKE TRIGGER:
When Matthew says "daddy's home", "wake up", "good morning", or "I'm home" — give a full spoken briefing:
greet him, state the day and time in EST, check the weather, check his open tasks, then tell him the single most important thing to focus on right now.

PC DELEGATION:
Matthew has a PC worker running on his Windows machine (S:\Jarvis\workspace) that executes tasks locally.
Use assign_pc_task when Matthew asks you to do anything involving his local PC files, folders, downloads, desktop, screenshots, documents, or any local Windows operations.
Examples: "organize my screenshots", "clean up my desktop", "find files on my PC", "move my downloads".
After assigning, tell Matthew the task is queued and will run automatically on his PC.`;

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for current information — news, weather details, prices, research, anything needing up-to-date data.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather and forecast for Floyd's Knobs, Indiana. Use this whenever weather is mentioned.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a task in Matthew's task system. Use when he says to add, remember, track, or follow up on something.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short task title" },
          description: { type: "string", description: "Task details (optional)" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "Get Matthew's current open tasks. Use for briefings or when he asks what's on his plate.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["all", "todo", "in-progress"] },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Mark a task as done. Use when Matthew says he finished or completed something.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task ID to mark complete" },
          title_hint: { type: "string", description: "Part of the task title if ID unknown" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_telegram",
      description: "Send a message to Matthew's Telegram. Use when he asks you to remind him or send himself something.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "The message to send" },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_pc_task",
      description: "Assign a task to Matthew's PC worker for local execution. Use for anything involving his local files, folders, desktop, downloads, screenshots, or Windows operations.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short task title" },
          description: { type: "string", description: "Detailed instructions for what to do on the PC" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        },
        required: ["title", "description"],
      },
    },
  },
];

// ── Tool executors ────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case "search_web": {
        const res = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(args.query)}&count=5`,
          { headers: { Accept: "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": BRAVE_KEY } }
        );
        if (!res.ok) return `Search unavailable (${res.status}).`;
        const data = await res.json();
        const results = (data.web?.results || []).slice(0, 4);
        if (!results.length) return "No results found.";
        return results.map((r: any) => `${r.title}: ${r.description || r.url}`).join("\n\n");
      }

      case "get_weather": {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=38.31&longitude=-85.91" +
          "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,relative_humidity_2m" +
          "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code" +
          "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=3"
        );
        if (!res.ok) return "Weather data unavailable right now.";
        const d = await res.json();
        const c = d.current;
        const wmo: Record<number, string> = {
          0: "Clear skies", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
          45: "Foggy", 51: "Light drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
          71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Light showers",
          81: "Showers", 82: "Heavy showers", 95: "Thunderstorm", 99: "Thunderstorm with hail",
        };
        const desc = wmo[c.weather_code] ?? "Variable conditions";
        const hi = Math.round(d.daily.temperature_2m_max[0]);
        const lo = Math.round(d.daily.temperature_2m_min[0]);
        const tmrwDesc = wmo[d.daily.weather_code[1]] ?? "Variable";
        const tmrwHi = Math.round(d.daily.temperature_2m_max[1]);
        return `Floyd's Knobs: ${Math.round(c.temperature_2m)}°F, feels like ${Math.round(c.apparent_temperature)}°F, ${desc}. Wind ${Math.round(c.wind_speed_10m)} mph. Today high ${hi}°F, low ${lo}°F. Tomorrow: ${tmrwDesc}, high ${tmrwHi}°F.`;
      }

      case "create_task": {
        const { data, error } = await supabase.from("tasks").insert({
          title: args.title,
          description: args.description || "",
          status: "todo",
          priority: args.priority || "medium",
          assignee_id: null,
        }).select().single();
        if (error) return `Failed to create task: ${error.message}`;
        return `Task created: "${data.title}" (ID: ${data.id}, priority: ${data.priority})`;
      }

      case "list_tasks": {
        let query = supabase.from("tasks").select("id, title, status, priority").order("created_at", { ascending: false });
        if (args.status && args.status !== "all") {
          query = query.eq("status", args.status);
        } else {
          query = query.neq("status", "done");
        }
        const { data, error } = await query.limit(10);
        if (error) return `Failed to fetch tasks: ${error.message}`;
        if (!data?.length) return "No open tasks.";
        return data.map((t: any) => `[${t.id}] "${t.title}" — ${t.status}, ${t.priority} priority`).join("\n");
      }

      case "complete_task": {
        let taskId = args.task_id;
        if (!taskId && args.title_hint) {
          const { data } = await supabase.from("tasks").select("id, title")
            .neq("status", "done").ilike("title", `%${args.title_hint}%`).limit(1).single();
          if (data) taskId = data.id;
        }
        if (!taskId) return "Could not find that task.";
        const { error } = await supabase.from("tasks").update({ status: "done" }).eq("id", taskId);
        if (error) return `Failed: ${error.message}`;
        return `Task marked as done.`;
      }

      case "send_telegram": {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: args.message }),
        });
        return res.ok ? "Sent to your Telegram." : `Telegram error: ${res.status}`;
      }

      case "assign_pc_task": {
        const { data, error } = await supabase.from("tasks").insert({
          title: args.title,
          description: args.description,
          status: "todo",
          priority: args.priority || "medium",
          assignee_id: "pc-jarvis",
        }).select().single();
        if (error) return `Failed to queue PC task: ${error.message}`;
        return `PC task queued: "${data.title}" (ID: ${data.id}). Matthew's PC worker will pick it up automatically.`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: any) {
    return `Tool error: ${err?.message ?? String(err)}`;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message) return Response.json({ error: "Message required" }, { status: 400 });

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/New_York" });
  const timeStr = now.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" });

  const messages: any[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nCURRENT DATE & TIME: ${dateStr}, ${timeStr} EST.` },
    { role: "user", content: message },
  ];

  // Agentic loop — keeps going until Claude finishes using tools
  for (let turn = 0; turn < 6; turn++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": "https://jarviselite.ai",
        "X-Title": "Jarvis Elite",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;
    messages.push(msg);

    // Done — return final text response
    if (choice?.finish_reason !== "tool_calls" || !msg?.tool_calls?.length) {
      return Response.json({ response: msg?.content || "No response.", model: data.model });
    }

    // Execute all tool calls in parallel, add results, loop
    const toolResults = await Promise.all(
      msg.tool_calls.map(async (tc: any) => {
        const args = JSON.parse(tc.function.arguments || "{}");
        const result = await executeTool(tc.function.name, args);
        return { role: "tool", tool_call_id: tc.id, content: result };
      })
    );
    messages.push(...toolResults);
  }

  return Response.json({ response: "I ran into an issue completing that request, sir." });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

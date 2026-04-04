import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;
const BRAVE_KEY = process.env.BRAVE_API_KEY!;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID!;

const SUPABASE_URL = "https://blpkggmfpxrjvcoclssq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscGtnZ21mcHhyanZjb2Nsc3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzA3NzAsImV4cCI6MjA4ODUwNjc3MH0.ikJG8Irz8EmKdcVea8a1If6c8dZX-RIsOjOsILTH0MM";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const AGENT_PROMPT = `You are JARVIS — an autonomous AI agent executing tasks for Matthew Eichenberger.
Matthew runs Elite Exteriors (home services) and Elite AI (automation agency) in Floyd's Knobs, Indiana.

Your job: execute the assigned task completely and independently. Use your tools. Don't ask questions — make reasonable decisions and get it done.

When finished, write a clear spoken summary of exactly what you did and what you found. No markdown, no bullet points. Clean spoken sentences only. End with "sir."

If a task requires something you can't do yet (like sending an email), complete as much as possible — draft the content, do the research — and clearly state what still needs human action.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for current information.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_multiple",
      description: "Run multiple web searches at once for comprehensive research.",
      parameters: {
        type: "object",
        properties: {
          queries: { type: "array", items: { type: "string" }, description: "List of search queries to run" },
        },
        required: ["queries"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather for Floyd's Knobs, Indiana.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a follow-up task if this work spawns additional actions needed.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_telegram",
      description: "Send the completed work or important findings to Matthew's Telegram.",
      parameters: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
      },
    },
  },
];

async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case "search_web": {
        const res = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(args.query)}&count=6`,
          { headers: { Accept: "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": BRAVE_KEY } }
        );
        if (!res.ok) return `Search failed (${res.status})`;
        const data = await res.json();
        const results = (data.web?.results || []).slice(0, 5);
        if (!results.length) return "No results found.";
        return results.map((r: any) => `${r.title}\n${r.description || ""}\nURL: ${r.url}`).join("\n\n---\n\n");
      }

      case "search_multiple": {
        const queries: string[] = args.queries || [];
        const results = await Promise.all(
          queries.map(async (q) => {
            const res = await fetch(
              `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=3`,
              { headers: { Accept: "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": BRAVE_KEY } }
            );
            if (!res.ok) return `"${q}": no results`;
            const data = await res.json();
            const hits = (data.web?.results || []).slice(0, 3);
            return `QUERY: "${q}"\n` + hits.map((r: any) => `- ${r.title}: ${r.description || r.url}`).join("\n");
          })
        );
        return results.join("\n\n===\n\n");
      }

      case "get_weather": {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=38.31&longitude=-85.91" +
          "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m" +
          "&daily=temperature_2m_max,temperature_2m_min,weather_code" +
          "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=3"
        );
        if (!res.ok) return "Weather unavailable.";
        const d = await res.json();
        const c = d.current;
        const wmo: Record<number, string> = {
          0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
          61: "Rain", 63: "Rain", 80: "Showers", 95: "Thunderstorm",
        };
        return `${Math.round(c.temperature_2m)}°F, ${wmo[c.weather_code] ?? "Variable"}, wind ${Math.round(c.wind_speed_10m)} mph. High ${Math.round(d.daily.temperature_2m_max[0])}°F.`;
      }

      case "create_task": {
        const { data, error } = await supabase.from("tasks").insert({
          title: args.title,
          description: args.description || "",
          status: "todo",
          priority: args.priority || "medium",
          assignee_id: null,
        }).select().single();
        if (error) return `Failed to create follow-up task: ${error.message}`;
        return `Follow-up task created: "${data.title}"`;
      }

      case "send_telegram": {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: args.message }),
        });
        return res.ok ? "Sent to Telegram." : `Telegram error: ${res.status}`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: any) {
    return `Tool error: ${err?.message}`;
  }
}

async function runAgentLoop(task: { title: string; description: string }): Promise<string> {
  const prompt = task.description?.trim()
    ? `Task: ${task.title}\n\nDetails: ${task.description}`
    : `Task: ${task.title}`;

  const messages: any[] = [
    { role: "system", content: AGENT_PROMPT },
    { role: "user", content: prompt },
  ];

  for (let turn = 0; turn < 8; turn++) {
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
        max_tokens: 2048,
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);

    const data = await res.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;
    messages.push(msg);

    if (choice?.finish_reason !== "tool_calls" || !msg?.tool_calls?.length) {
      return msg?.content || "Task completed.";
    }

    const toolResults = await Promise.all(
      msg.tool_calls.map(async (tc: any) => {
        const args = JSON.parse(tc.function.arguments || "{}");
        const result = await executeTool(tc.function.name, args);
        return { role: "tool", tool_call_id: tc.id, content: result };
      })
    );
    messages.push(...toolResults);
  }

  return "Task processing reached maximum steps.";
}

export async function POST(req: NextRequest) {
  const { task_id } = await req.json();
  if (!task_id) return Response.json({ error: "task_id required" }, { status: 400 });

  // Fetch the task
  const { data: task, error: fetchErr } = await supabase
    .from("tasks").select("*").eq("id", task_id).single();

  if (fetchErr || !task) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  // Mark as in-progress
  await supabase.from("tasks").update({
    status: "in-progress",
    assignee_id: "jarvis",
  }).eq("id", task_id);

  // Notify Matthew it started
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT,
      text: `⚡ Jarvis is working on: "${task.title}"`,
    }),
  });

  try {
    // Run the agentic execution
    const result = await runAgentLoop({ title: task.title, description: task.description });

    // Save result and mark done
    await supabase.from("tasks").update({
      status: "done",
      description: `${task.description ? task.description + "\n\n" : ""}--- Jarvis result ---\n${result}`,
    }).eq("id", task_id);

    // Send result to Telegram
    const telegramMsg = `✅ Task complete: "${task.title}"\n\n${result}`;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT,
        text: telegramMsg.slice(0, 4000), // Telegram limit
      }),
    });

    return Response.json({ success: true, result });

  } catch (err: any) {
    await supabase.from("tasks").update({ status: "todo", assignee_id: null }).eq("id", task_id);
    return Response.json({ error: err?.message }, { status: 500 });
  }
}

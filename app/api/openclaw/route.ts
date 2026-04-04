import { NextRequest } from "next/server";

const GATEWAY_URL   = process.env.OPENCLAW_GATEWAY_URL   || "https://api.jarviselite.ai";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "1c940d0888f4ce422e9d734c5ae88117fe8510cfaa8a6ac4";

/**
 * Streams the real openclaw agent's response directly to the browser.
 * This is the full Jarvis — memory, tools, agent creation, code execution, everything.
 */
export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  if (!messages?.length) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const upstream = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({
      model: "openclaw/main",
      messages,
      stream: true,
      max_tokens: 4096,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return Response.json({ error: `Gateway error: ${upstream.status} — ${err}` }, { status: upstream.status });
  }

  // Pipe the SSE stream straight through to the browser
  const { readable, writable } = new TransformStream();
  upstream.body!.pipeTo(writable).catch(() => {});

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
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

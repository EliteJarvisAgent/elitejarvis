import { NextRequest } from "next/server";

// Proxy to the Jarvis bridge (which has OpenRouter + full system prompt)
const BRIDGE_URL = "https://lovable-jarvis-bridge.vercel.app/api/jarvis";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const upstream = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JARVIS_URL = "https://lovable-jarvis-bridge.vercel.app/api/jarvis";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, stream } = await req.json();

    const res = await fetch(JARVIS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, stream: !!stream }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Jarvis API error:", res.status, errText);
      return new Response(
        JSON.stringify({ error: `Jarvis API returned ${res.status}` }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If streaming, pass through the SSE stream
    if (stream && res.headers.get("content-type")?.includes("text/event-stream")) {
      return new Response(res.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming fallback
    const data = await res.json();
    console.log("Jarvis response:", JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("jarvis-proxy error:", e);
    return new Response(
      JSON.stringify({ error: "Proxy error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
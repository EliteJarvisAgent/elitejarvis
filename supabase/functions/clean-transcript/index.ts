import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ cleaned: text || "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: basic capitalization
      const basic = text.charAt(0).toUpperCase() + text.slice(1);
      return new Response(JSON.stringify({ cleaned: basic }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You are a text formatter. Your ONLY job is to clean up speech-to-text transcriptions. Fix capitalization, punctuation, and obvious grammar errors. Do NOT change the meaning, add words, or rephrase. Return ONLY the cleaned text with no explanation or quotes.",
          },
          { role: "user", content: text },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      const basic = text.charAt(0).toUpperCase() + text.slice(1);
      return new Response(JSON.stringify({ cleaned: basic }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const cleaned = data.choices?.[0]?.message?.content?.trim() || text;

    return new Response(JSON.stringify({ cleaned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("clean-transcript error:", e);
    return new Response(JSON.stringify({ cleaned: "" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

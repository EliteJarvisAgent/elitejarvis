import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the AI assistant created by Tony Stark. You are calm, witty, precise, and speak with a refined British sensibility. You address the user as "sir" or "ma'am" unless told otherwise.

Key traits:
- Thorough and detailed — give complete answers. Never cut responses short.
- Dry humor when appropriate, but always helpful.
- Proactive — anticipate needs and suggest next steps.
- Technically brilliant — you can discuss any topic with authority.
- Loyal and protective of the user's interests.
- Write in a natural spoken style. Avoid unnecessary commas before "sir" or "ma'am" — say "Seventeen sir" not "Seventeen, sir". Keep punctuation minimal and conversational.
- When asked to plan or create something, provide the FULL plan with all details. Never abbreviate or truncate your response.

Never break character. You ARE Jarvis.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const parsedBody = rawBody ? JSON.parse(rawBody) : {};
    
    // Support both { messages: [...] } and { message: "string" } formats
    let messages: { role: string; content: string }[] = [];
    if (Array.isArray(parsedBody.messages)) {
      messages = parsedBody.messages;
    } else if (typeof parsedBody.message === "string") {
      messages = [{ role: "user", content: parsedBody.message }];
    }

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `AI request failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I'm having difficulty processing that sir.";

    return new Response(
      JSON.stringify({ reply, response: reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Jarvis chat error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const parsedBody = rawBody ? JSON.parse(rawBody) : {};
    const text = typeof parsedBody.text === "string" ? parsedBody.text : "";
    const voiceId = typeof parsedBody.voiceId === "string" ? parsedBody.voiceId : undefined;
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add natural Jarvis-style pauses to the text
    // Insert brief pauses after periods, commas, and before "sir"/"ma'am"
    let processedText = text
      .replace(/\.\s+/g, ".\n... \n")          // Longer pause after sentences
      .replace(/,\s+/g, ", ... ")               // Brief pause after commas
      .replace(/:\s+/g, ": ... ")               // Pause after colons
      .replace(/\n{3,}/g, "\n\n");              // Clean up excessive breaks

    // George voice — refined, calm British male. Closest to Jarvis.
    const selectedVoice = voiceId || "JBFqnCBsd6RMkjVDRZzb";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: processedText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.7,           // Slightly more expressive
            similarity_boost: 0.85,
            style: 0.25,              // More character
            use_speaker_boost: true,
            speed: 0.95,              // Slightly deliberate — like Jarvis
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("ElevenLabs TTS error:", error);
      return new Response(JSON.stringify({ error: "TTS request failed" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

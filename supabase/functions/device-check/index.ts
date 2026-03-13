import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, device_token, label } = body;

    // Get client IP from headers
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (action === "verify") {
      // Check device token first
      if (device_token) {
        const { data: deviceMatch } = await supabase
          .from("trusted_devices")
          .select("*")
          .eq("device_token", device_token)
          .eq("is_revoked", false)
          .maybeSingle();

        if (deviceMatch) {
          // Update last seen and IP
          await supabase
            .from("trusted_devices")
            .update({ last_seen_at: new Date().toISOString(), ip_address: ip })
            .eq("id", deviceMatch.id);

          return new Response(
            JSON.stringify({ allowed: true, method: "device_token", ip }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Fallback: check IP
      const { data: ipMatch } = await supabase
        .from("trusted_devices")
        .select("*")
        .eq("ip_address", ip)
        .eq("is_revoked", false)
        .limit(1)
        .maybeSingle();

      if (ipMatch) {
        return new Response(
          JSON.stringify({ allowed: true, method: "ip_match", ip }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ allowed: false, ip }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register") {
      if (!device_token) {
        return new Response(
          JSON.stringify({ error: "device_token required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upsert device
      const { data, error } = await supabase
        .from("trusted_devices")
        .upsert(
          {
            device_token,
            ip_address: ip,
            label: label || "Unknown Device",
            is_revoked: false,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "device_token" }
        )
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ registered: true, device: data, ip }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'verify' or 'register'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

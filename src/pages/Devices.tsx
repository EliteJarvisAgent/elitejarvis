import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-safe-client";
import { Shield, Trash2, RefreshCw, Monitor } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface TrustedDevice {
  id: string;
  device_token: string;
  ip_address: string | null;
  label: string;
  is_revoked: boolean;
  last_seen_at: string;
  created_at: string;
}

const DEVICE_TOKEN_KEY = "jarvis-device-token";

export default function DevicesPage() {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const currentToken = localStorage.getItem(DEVICE_TOKEN_KEY);

  const fetchDevices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trusted_devices")
      .select("*")
      .order("last_seen_at", { ascending: false });
    setDevices((data as TrustedDevice[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const revokeDevice = async (id: string) => {
    await supabase
      .from("trusted_devices")
      .update({ is_revoked: true })
      .eq("id", id);
    fetchDevices();
  };

  const reinstateDevice = async (id: string) => {
    await supabase
      .from("trusted_devices")
      .update({ is_revoked: false })
      .eq("id", id);
    fetchDevices();
  };

  const deleteDevice = async (id: string) => {
    await supabase.from("trusted_devices").delete().eq("id", id);
    fetchDevices();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center border border-primary/25">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold text-foreground tracking-wide">TRUSTED DEVICES</h1>
            <p className="text-xs text-muted-foreground font-mono">Manage device & IP access</p>
          </div>
        </div>
        <button
          onClick={fetchDevices}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/60 text-muted-foreground hover:text-foreground text-xs font-mono transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          REFRESH
        </button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground font-mono text-sm py-12">Loading devices…</div>
      ) : devices.length === 0 ? (
        <div className="text-center text-muted-foreground font-mono text-sm py-12">
          No devices registered yet. Devices are registered after successful password authentication.
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const isCurrentDevice = device.device_token === currentToken;
            return (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-4 ${
                  device.is_revoked
                    ? "bg-card/50 border-destructive/30 opacity-60"
                    : isCurrentDevice
                    ? "bg-card border-primary/40"
                    : "bg-card border-border/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Monitor className={`h-5 w-5 ${device.is_revoked ? "text-destructive" : "text-primary"}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {device.label}
                        </span>
                        {isCurrentDevice && (
                          <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            THIS DEVICE
                          </span>
                        )}
                        {device.is_revoked && (
                          <span className="text-[10px] font-mono bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                            REVOKED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
                        <span>IP: {device.ip_address || "unknown"}</span>
                        <span>•</span>
                        <span>Last seen: {format(new Date(device.last_seen_at), "MMM d, HH:mm")}</span>
                        <span>•</span>
                        <span>Added: {format(new Date(device.created_at), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.is_revoked ? (
                      <button
                        onClick={() => reinstateDevice(device.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20 transition-colors"
                      >
                        REINSTATE
                      </button>
                    ) : (
                      <button
                        onClick={() => revokeDevice(device.id)}
                        disabled={isCurrentDevice}
                        className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-mono hover:bg-destructive/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        REVOKE
                      </button>
                    )}
                    <button
                      onClick={() => deleteDevice(device.id)}
                      disabled={isCurrentDevice}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

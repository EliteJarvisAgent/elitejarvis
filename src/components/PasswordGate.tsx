import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Activity, Eye, EyeOff, Shield, Loader2 } from "lucide-react";

const CORRECT_PASSWORD = "!CuUcm3~~";
const STORAGE_KEY = "jarvis-auth-v2";
const DEVICE_TOKEN_KEY = "jarvis-device-token";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "blpkggmfpxrjvcoclssq";
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const CLOUD_URL = `https://${PROJECT_ID}.supabase.co`;

function getOrCreateDeviceToken(): string {
  let token = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  }
  return token;
}

function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "iOS Device";
  if (/Android/.test(ua)) return "Android Device";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown Device";
}

async function callDeviceCheck(action: string, deviceToken: string, label?: string) {
  const res = await fetch(`${CLOUD_URL}/functions/v1/device-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ action, device_token: deviceToken, label }),
  });
  if (!res.ok) throw new Error(`Device check failed: ${res.status}`);
  return res.json();
}

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Verifying device…");

  useEffect(() => {
    verifyDevice();
  }, []);

  const verifyDevice = async () => {
    try {
      const deviceToken = getOrCreateDeviceToken();
      const result = await callDeviceCheck("verify", deviceToken);

      if (result.allowed) {
        // Device or IP recognized — grant access
        const expiry = Date.now() + 14 * 24 * 60 * 60 * 1000;
        localStorage.setItem(STORAGE_KEY, expiry.toString());
        setAuthenticated(true);
      } else {
        // Check local expiry as fallback
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && Date.now() < parseInt(stored, 10)) {
          // Local session still valid, re-register this device
          await callDeviceCheck("register", deviceToken, getDeviceLabel());
          setAuthenticated(true);
        }
      }
    } catch {
      // Network error — fall back to local auth check
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && Date.now() < parseInt(stored, 10)) {
        setAuthenticated(true);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      const expiry = Date.now() + 14 * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, expiry.toString());

      // Register this device as trusted
      try {
        const deviceToken = getOrCreateDeviceToken();
        await callDeviceCheck("register", deviceToken, getDeviceLabel());
      } catch {
        // Registration failed but password was correct, still allow access
      }

      setAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/25">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono">
            <Loader2 className="h-4 w-4 animate-spin" />
            {statusMessage}
          </div>
        </motion.div>
      </div>
    );
  }

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/25">
            <Activity className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="font-mono font-bold text-xl tracking-wider text-foreground">JARVIS</h1>
            <p className="text-muted-foreground text-xs font-mono tracking-wide mt-1">AI COMMAND CENTER</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter access code"
              autoFocus
              className="w-full h-12 pl-10 pr-12 rounded-xl bg-card border border-border/60 text-foreground font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-xs font-mono text-center"
            >
              ACCESS DENIED
            </motion.p>
          )}
          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-mono text-sm font-semibold tracking-wider hover:bg-primary/90 transition-colors"
          >
            AUTHENTICATE
          </button>
        </form>
      </motion.div>
    </div>
  );
}

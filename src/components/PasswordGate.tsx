import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Activity, Eye, EyeOff } from "lucide-react";

const CORRECT_PASSWORD = "!CuUcm3~~";
const STORAGE_KEY = "jarvis-auth-v2";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const expiry = parseInt(stored, 10);
      if (Date.now() < expiry) {
        setAuthenticated(true);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      const expiry = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days
      localStorage.setItem(STORAGE_KEY, expiry.toString());
      setAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

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

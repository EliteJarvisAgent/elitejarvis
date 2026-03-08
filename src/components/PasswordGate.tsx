import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Activity } from "lucide-react";

const CORRECT_PASSWORD = "Xk9#mV2$qLz7!nR4";
const STORAGE_KEY = "jarvis-auth";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "true") setAuthenticated(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter access code"
              autoFocus
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-card border border-border/60 text-foreground font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
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

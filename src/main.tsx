// Jarvis Dashboard v2 – Cloud backend sync
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Log backend URL for debugging (remove later)
console.log("[JARVIS] Backend URL:", import.meta.env.VITE_SUPABASE_URL);

createRoot(document.getElementById("root")!).render(<App />);

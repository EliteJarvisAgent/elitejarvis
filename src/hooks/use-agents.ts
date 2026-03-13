import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { agents as fallbackAgents, type Agent } from "@/data/agents";

interface DbAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  image_url: string | null;
  status: string;
  capabilities: string[];
  tasks_completed: number;
  uptime: string;
  color: string;
  sort_order: number;
}

function mapDbAgent(db: DbAgent): Agent {
  // Try to find a matching fallback for the static image
  const fallback = fallbackAgents.find((a) => a.id === db.id);
  return {
    id: db.id,
    name: db.name,
    role: db.role,
    description: db.description,
    image: db.image_url || fallback?.image || "",
    status: (db.status as Agent["status"]) || "idle",
    capabilities: db.capabilities || [],
    tasksCompleted: db.tasks_completed || 0,
    uptime: db.uptime || "0%",
    color: db.color || "primary",
  };
}

let cachedAgents: Agent[] | null = null;
let fetchPromise: Promise<Agent[]> | null = null;

async function loadAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) {
    return fallbackAgents;
  }
  return (data as DbAgent[]).map(mapDbAgent);
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>(cachedAgents || fallbackAgents);
  const [isLoading, setIsLoading] = useState(!cachedAgents);

  useEffect(() => {
    if (cachedAgents) {
      setAgents(cachedAgents);
      setIsLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = loadAgents();
    }

    fetchPromise.then((result) => {
      cachedAgents = result;
      setAgents(result);
      setIsLoading(false);
    });
  }, []);

  const refresh = async () => {
    fetchPromise = null;
    cachedAgents = null;
    const result = await loadAgents();
    cachedAgents = result;
    setAgents(result);
  };

  return { agents, isLoading, refresh };
}

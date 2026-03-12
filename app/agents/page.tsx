"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Play, Pause, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "online" | "idle" | "offline";
  uptime: number;
  lastActive: string;
  tasksCompleted: number;
  avgResponseTime: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        setAgents(data.agents);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
        toast.error("Failed to load agents");
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-900 text-green-200";
      case "idle":
        return "bg-yellow-900 text-yellow-200";
      default:
        return "bg-slate-700 text-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "online") {
      return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />;
    }
    return <div className="w-2 h-2 bg-slate-500 rounded-full" />;
  };

  const handleAction = (agentId: string, action: string) => {
    toast.success(`${action} agent: ${agentId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Agents</h1>
        <p className="text-slate-400">Manage and monitor your AI agents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="bg-slate-900 border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(agent.status)}
                      <Badge className={getStatusColor(agent.status)}>
                        {agent.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">{agent.role}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Uptime</span>
                  <span className="text-slate-100 font-medium">{agent.uptime.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${agent.uptime}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tasks Completed</p>
                  <p className="text-xl font-bold text-white">{agent.tasksCompleted}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Avg Response</p>
                  <p className="text-xl font-bold text-white">
                    {(agent.avgResponseTime / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-slate-600 hover:bg-slate-800"
                  onClick={() => handleAction(agent.id, "Resume")}
                >
                  <Play size={16} className="mr-1" />
                  Resume
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-slate-600 hover:bg-slate-800"
                  onClick={() => handleAction(agent.id, "Restart")}
                >
                  <RefreshCw size={16} className="mr-1" />
                  Restart
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Zap,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Metrics {
  totalTasks: number;
  tasksInProgress: number;
  agentsOnline: number;
  systemUptime: number;
  avgResponseTime: number;
  tasksCompletedToday: number;
}

interface Task {
  id: number;
  title: string;
  agent: string;
  status: string;
  createdAt: string;
  duration: number;
}

const MetricCard = ({
  title,
  value,
  icon: Icon,
  unit,
  trend,
}: {
  title: string;
  value: string | number | undefined;
  icon: React.ReactNode;
  unit?: string;
  trend?: number;
}) => (
  <Card className="bg-slate-900 border-slate-700">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
      <div className="text-slate-500">{Icon}</div>
    </CardHeader>
    <CardContent>
      <div className="flex items-end gap-2">
        <div className="text-3xl font-bold text-white">
          {value}
          {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
        </div>
        {trend && (
          <span className={`text-sm ${trend > 0 ? "text-green-500" : "text-red-500"}`}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [metricsRes, tasksRes] = await Promise.all([
          fetch("/api/metrics"),
          fetch("/api/tasks"),
        ]);
        const metricsData = await metricsRes.json();
        const tasksData = await tasksRes.json();

        setMetrics(metricsData);
        setTasks(tasksData.tasks);

        // Generate mock chart data
        const now = new Date();
        setChartData(
          Array.from({ length: 12 }, (_, i) => ({
            time: new Date(now.getTime() - (11 - i) * 60 * 60000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            tasks: Math.floor(Math.random() * 50) + 100,
            uptime: Math.floor(Math.random() * 3) + 97,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Real-time AI agent management and monitoring</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Total Tasks"
          value={metrics?.totalTasks}
          icon={<CheckCircle2 size={20} />}
          trend={12}
        />
        <MetricCard
          title="Tasks In Progress"
          value={metrics?.tasksInProgress}
          icon={<Activity size={20} />}
          trend={5}
        />
        <MetricCard
          title="Agents Online"
          value={metrics?.agentsOnline}
          icon={<Users size={20} />}
        />
        <MetricCard
          title="System Uptime"
          value={metrics?.systemUptime?.toFixed(1)}
          unit="%"
          icon={<Zap size={20} />}
        />
        <MetricCard
          title="Avg Response Time"
          value={metrics?.avgResponseTime}
          unit="ms"
          icon={<Clock size={20} />}
          trend={-8}
        />
        <MetricCard
          title="Completed Today"
          value={metrics?.tasksCompletedToday}
          icon={<TrendingUp size={20} />}
          trend={23}
        />
      </div>

      {/* Charts and Task Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="bg-slate-900 border-slate-700 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Task Activity (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155" }}
                  labelStyle={{ color: "#f1f5f9" }}
                />
                <Line
                  type="monotone"
                  dataKey="tasks"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-slate-800 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-100 font-medium truncate">{task.title}</p>
                    <p className="text-xs text-slate-400">{task.agent}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                      task.status === "completed"
                        ? "bg-green-900 text-green-200"
                        : "bg-blue-900 text-blue-200"
                    }`}
                  >
                    {task.status === "completed" ? "Done" : "Running"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

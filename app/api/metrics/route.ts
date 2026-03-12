import { MOCK_METRICS, MOCK_AGENTS } from "@/data/mock-agents";

export async function GET() {
  // Add some randomness to simulate real metrics
  const randomVariance = (value: number, percent: number) => {
    const variance = value * (percent / 100);
    return Math.round(value + (Math.random() - 0.5) * 2 * variance);
  };

  return Response.json({
    totalTasks: MOCK_METRICS.totalTasks,
    tasksInProgress: randomVariance(MOCK_METRICS.tasksInProgress, 50),
    agentsOnline: MOCK_AGENTS.filter((a) => a.status === "online").length,
    systemUptime: randomVariance(MOCK_METRICS.systemUptime, 1),
    avgResponseTime: randomVariance(MOCK_METRICS.avgResponseTime, 10),
    tasksCompletedToday: randomVariance(MOCK_METRICS.tasksCompletedToday, 20),
    timestamp: new Date().toISOString(),
  });
}

import { MOCK_TASKS } from "@/data/mock-agents";

export async function GET() {
  return Response.json({
    tasks: MOCK_TASKS,
    total: MOCK_TASKS.length,
    inProgress: MOCK_TASKS.filter((t) => t.status === "in_progress").length,
    completed: MOCK_TASKS.filter((t) => t.status === "completed").length,
  });
}

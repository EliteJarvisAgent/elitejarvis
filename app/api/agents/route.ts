import { MOCK_AGENTS } from "@/data/mock-agents";

export async function GET() {
  return Response.json({
    agents: MOCK_AGENTS,
    total: MOCK_AGENTS.length,
    online: MOCK_AGENTS.filter((a) => a.status === "online").length,
  });
}

export type TaskStatus = "backlog" | "todo" | "in-progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  createdAt: string;
}

export const initialTasks: Task[] = [
  {
    id: "1",
    title: "Q1 Revenue Report — Final Review",
    description: "Complete final review of Q1 revenue figures and prepare executive summary.",
    status: "in-progress",
    priority: "critical",
    assigneeId: "research",
    createdAt: "2026-03-07",
  },
  {
    id: "2",
    title: "Website Redesign — Brand Guidelines",
    description: "Update brand guidelines doc for the new website redesign project.",
    status: "review",
    priority: "high",
    assigneeId: "content",
    createdAt: "2026-03-06",
  },
  {
    id: "3",
    title: "API Security Audit",
    description: "Run comprehensive security audit on all public-facing APIs.",
    status: "in-progress",
    priority: "high",
    assigneeId: "security",
    createdAt: "2026-03-05",
  },
  {
    id: "4",
    title: "Deploy Staging Environment",
    description: "Provision and deploy the new staging environment with latest changes.",
    status: "todo",
    priority: "medium",
    assigneeId: "devops",
    createdAt: "2026-03-07",
  },
  {
    id: "5",
    title: "Database Migration v3.2",
    description: "Execute schema migration for v3.2 with zero-downtime strategy.",
    status: "todo",
    priority: "high",
    assigneeId: "data",
    createdAt: "2026-03-08",
  },
  {
    id: "6",
    title: "Weekly Team Sync Notes",
    description: "Compile and distribute notes from weekly team synchronization meeting.",
    status: "done",
    priority: "low",
    assigneeId: "jarvis",
    createdAt: "2026-03-04",
  },
  {
    id: "7",
    title: "Social Media Campaign Draft",
    description: "Create draft posts for the upcoming product launch campaign.",
    status: "backlog",
    priority: "medium",
    assigneeId: null,
    createdAt: "2026-03-08",
  },
  {
    id: "8",
    title: "Monitor Server Health",
    description: "Set up automated health checks and alerting for production servers.",
    status: "backlog",
    priority: "low",
    assigneeId: null,
    createdAt: "2026-03-08",
  },
];

export const statusColumns: { id: TaskStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

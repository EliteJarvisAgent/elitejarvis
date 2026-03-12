"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, Trash2, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: number;
  title: string;
  agent: string;
  status: string;
  createdAt: string;
  duration: number;
}

const TASK_TEMPLATES = [
  {
    id: 1,
    name: "Email Analysis",
    description: "Analyze email campaigns and engagement",
    agent: "analytics-bot",
    icon: "📧",
  },
  {
    id: 2,
    name: "Blog Post Generation",
    description: "Generate blog posts on specified topics",
    agent: "writer-bot",
    icon: "📝",
  },
  {
    id: 3,
    name: "Code Review",
    description: "Perform code reviews on pull requests",
    agent: "code-bot",
    icon: "💻",
  },
  {
    id: 4,
    name: "Market Research",
    description: "Research and analyze market trends",
    agent: "research-bot",
    icon: "📊",
  },
  {
    id: 5,
    name: "Customer Support",
    description: "Process and respond to customer inquiries",
    agent: "jarvis",
    icon: "🤝",
  },
  {
    id: 6,
    name: "Data Processing",
    description: "Process and clean datasets",
    agent: "analytics-bot",
    icon: "🔢",
  },
];

const RECURRING_JOBS = [
  {
    id: 1,
    name: "Daily Report Generation",
    schedule: "9:00 AM Every Day",
    lastRun: "Today at 9:00 AM",
    nextRun: "Tomorrow at 9:00 AM",
    status: "active",
  },
  {
    id: 2,
    name: "Weekly Analytics Summary",
    schedule: "Monday at 8:00 AM",
    lastRun: "Mar 10 at 8:00 AM",
    nextRun: "Mar 17 at 8:00 AM",
    status: "active",
  },
  {
    id: 3,
    name: "Monthly Budget Review",
    schedule: "1st of Month at 10:00 AM",
    lastRun: "Mar 1 at 10:00 AM",
    nextRun: "Apr 1 at 10:00 AM",
    status: "active",
  },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch("/api/tasks");
        const data = await res.json();
        setTasks(data.tasks);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        toast.error("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleCreateTask = (templateId: number) => {
    const template = TASK_TEMPLATES.find((t) => t.id === templateId);
    toast.success(`Task "${template?.name}" created and scheduled`);
  };

  const handleDeleteRecurring = (jobId: number) => {
    toast.success("Recurring job deleted");
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
        <h1 className="text-4xl font-bold text-white mb-2">Tasks</h1>
        <p className="text-slate-400">Create and manage task templates and recurring jobs</p>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="recurring">Recurring Jobs</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TASK_TEMPLATES.map((template) => (
              <Card key={template.id} className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-3xl">{template.icon}</div>
                    <Badge variant="outline" className="border-slate-600">
                      {template.agent}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{template.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{template.description}</p>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleCreateTask(template.id)}
                  >
                    <Plus size={16} className="mr-2" />
                    Create Task
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recurring Jobs Tab */}
        <TabsContent value="recurring" className="space-y-4">
          {RECURRING_JOBS.map((job) => (
            <Card key={job.id} className="bg-slate-900 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{job.name}</h3>
                      <Badge className="bg-green-900 text-green-200">{job.status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>{job.schedule}</span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Last Run</p>
                        <p className="text-slate-100">{job.lastRun}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Next Run</p>
                        <p className="text-slate-100">{job.nextRun}</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-2"
                    onClick={() => handleDeleteRecurring(job.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <div className="space-y-2">
            {tasks.map((task) => (
              <Card key={task.id} className="bg-slate-900 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white mb-1">{task.title}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span>{task.agent}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {task.duration}ms
                        </span>
                      </div>
                    </div>
                    <Badge
                      className={
                        task.status === "completed"
                          ? "bg-green-900 text-green-200"
                          : "bg-blue-900 text-blue-200"
                      }
                    >
                      {task.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

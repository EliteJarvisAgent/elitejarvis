import agentJarvis from "@/assets/agent-jarvis.png";
import agentResearch from "@/assets/agent-research.png";
import agentSecurity from "@/assets/agent-security.png";
import agentData from "@/assets/agent-data.png";
import agentContent from "@/assets/agent-content.png";
import agentDevops from "@/assets/agent-devops.png";

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  image: string;
  status: "active" | "idle" | "error";
  capabilities: string[];
  tasksCompleted: number;
  uptime: string;
  color: string;
}

export const agents: Agent[] = [
  {
    id: "jarvis",
    name: "Jarvis",
    role: "Central Intelligence",
    description:
      "Master orchestrator that coordinates all sub-agents, manages task delegation, and provides unified voice interface for the command center.",
    image: agentJarvis,
    status: "active",
    capabilities: ["Task Orchestration", "Voice Interface", "Agent Coordination", "Decision Making"],
    tasksCompleted: 342,
    uptime: "99.98%",
    color: "primary",
  },
  {
    id: "research",
    name: "ResearchBot",
    role: "Research & Analysis",
    description:
      "Deep-dive research agent specializing in competitor analysis, market trends, and data-driven insights across multiple sources.",
    image: agentResearch,
    status: "active",
    capabilities: ["Web Scraping", "Data Analysis", "Report Generation", "Trend Detection"],
    tasksCompleted: 128,
    uptime: "99.5%",
    color: "primary",
  },
  {
    id: "security",
    name: "SecBot",
    role: "Security & Compliance",
    description:
      "Automated security auditor that scans APIs, monitors vulnerabilities, and ensures compliance with security protocols.",
    image: agentSecurity,
    status: "active",
    capabilities: ["Vulnerability Scanning", "API Auditing", "Threat Detection", "Compliance Checks"],
    tasksCompleted: 89,
    uptime: "99.9%",
    color: "destructive",
  },
  {
    id: "data",
    name: "DataSync",
    role: "Data Synchronization",
    description:
      "Handles real-time data pipelines, database synchronization, backup operations, and data integrity validation.",
    image: agentData,
    status: "idle",
    capabilities: ["ETL Pipelines", "Database Sync", "Backup Management", "Data Validation"],
    tasksCompleted: 215,
    uptime: "99.7%",
    color: "accent",
  },
  {
    id: "content",
    name: "ContentGen",
    role: "Content Generation",
    description:
      "AI-powered content creation agent for copywriting, social media posts, documentation, and creative assets.",
    image: agentContent,
    status: "idle",
    capabilities: ["Copywriting", "Social Media", "Documentation", "Creative Assets"],
    tasksCompleted: 76,
    uptime: "98.2%",
    color: "info",
  },
  {
    id: "devops",
    name: "DevOps Agent",
    role: "Deployment & Infrastructure",
    description:
      "Manages CI/CD pipelines, server provisioning, monitoring dashboards, and automated deployment workflows.",
    image: agentDevops,
    status: "idle",
    capabilities: ["CI/CD Pipelines", "Server Monitoring", "Auto-Scaling", "Deploy Automation"],
    tasksCompleted: 156,
    uptime: "99.6%",
    color: "warning",
  },
];

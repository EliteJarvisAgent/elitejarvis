
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url text DEFAULT NULL,
  status text NOT NULL DEFAULT 'idle',
  capabilities text[] NOT NULL DEFAULT '{}',
  tasks_completed integer NOT NULL DEFAULT 0,
  uptime text NOT NULL DEFAULT '99.0%',
  color text NOT NULL DEFAULT 'primary',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on agents" ON public.agents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.agents (name, role, description, status, capabilities, tasks_completed, uptime, color, sort_order)
VALUES (
  'Jarvis',
  'Central Intelligence',
  'Master orchestrator that coordinates all sub-agents, manages task delegation, and provides unified voice interface for the command center.',
  'active',
  ARRAY['Task Orchestration', 'Voice Interface', 'Agent Coordination', 'Decision Making'],
  342,
  '99.98%',
  'primary',
  0
);

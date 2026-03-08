
-- Task templates table
CREATE TABLE public.task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assignee_id TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on task_templates" ON public.task_templates
  FOR ALL USING (true) WITH CHECK (true);

-- Recurring schedules table
CREATE TABLE public.recurring_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.task_templates(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  schedule_time TEXT NOT NULL DEFAULT '09:00',
  schedule_days TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_run TIMESTAMP WITH TIME ZONE,
  last_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on recurring_schedules" ON public.recurring_schedules
  FOR ALL USING (true) WITH CHECK (true);

-- Task activity log table
CREATE TABLE public.task_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on task_activity" ON public.task_activity
  FOR ALL USING (true) WITH CHECK (true);

-- Pre-instructions table
CREATE TABLE public.pre_instructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pre_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on pre_instructions" ON public.pre_instructions
  FOR ALL USING (true) WITH CHECK (true);

-- Add scheduled_for to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL;

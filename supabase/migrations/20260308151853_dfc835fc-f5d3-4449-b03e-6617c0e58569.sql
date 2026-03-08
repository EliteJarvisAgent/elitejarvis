
-- Drop restrictive policies and create permissive ones
DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all on tasks" ON public.tasks;

CREATE POLICY "Allow all on messages"
ON public.messages
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all on tasks"
ON public.tasks
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

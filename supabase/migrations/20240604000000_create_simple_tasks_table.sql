CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security if it's not already enabled for the table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read and write access to tasks for now
DROP POLICY IF EXISTS "Public tasks" ON public.tasks;
CREATE POLICY "Public tasks" ON public.tasks
  FOR ALL
  USING (true)
  WITH CHECK (true); 
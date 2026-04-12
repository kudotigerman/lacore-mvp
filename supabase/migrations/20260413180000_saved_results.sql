-- Persist AI tool outputs per user + project + type (upsert one row each)
CREATE TABLE IF NOT EXISTS public.saved_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  type text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT saved_results_unique UNIQUE (user_id, project_id, type),
  CONSTRAINT saved_results_type_check CHECK (type IN ('pricing', 'sequence', 'outreach'))
);

CREATE INDEX IF NOT EXISTS saved_results_user_project_idx ON public.saved_results (user_id, project_id);

ALTER TABLE public.saved_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_results_own" ON public.saved_results;
CREATE POLICY "saved_results_own" ON public.saved_results
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

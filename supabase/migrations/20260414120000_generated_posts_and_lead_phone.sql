-- AI-generated social posts (content tool)
CREATE TABLE IF NOT EXISTS public.generated_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  platform text NOT NULL,
  post_type text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generated_posts_project_created_idx
  ON public.generated_posts (project_id, created_at DESC);

ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "generated_posts_own" ON public.generated_posts;
CREATE POLICY "generated_posts_own" ON public.generated_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Optional phone for manually added leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone text;

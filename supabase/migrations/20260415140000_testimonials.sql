-- Testimonials: /review/[slug] submissions and public landing display
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects (id),
  slug text NOT NULL,
  client_name text NOT NULL,
  client_role text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content text NOT NULL,
  approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS testimonials_slug_idx ON public.testimonials (slug);
CREATE INDEX IF NOT EXISTS testimonials_user_id_idx ON public.testimonials (user_id);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Replace prior migration policy names if re-running in dev
DROP POLICY IF EXISTS "testimonials_read_approved" ON public.testimonials;
DROP POLICY IF EXISTS "testimonials_owner_all" ON public.testimonials;
DROP POLICY IF EXISTS "public_insert" ON public.testimonials;
DROP POLICY IF EXISTS "owner_all" ON public.testimonials;
DROP POLICY IF EXISTS "approved_read" ON public.testimonials;

CREATE POLICY "public_insert" ON public.testimonials FOR INSERT WITH CHECK (true);
CREATE POLICY "owner_all" ON public.testimonials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "approved_read" ON public.testimonials FOR SELECT USING (approved = true);

-- Client testimonials collected via /review/[slug]; inserts via service API only
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  slug text NOT NULL,
  client_name text NOT NULL,
  client_role text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content text NOT NULL,
  approved boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS testimonials_slug_idx ON public.testimonials (slug);
CREATE INDEX IF NOT EXISTS testimonials_user_id_idx ON public.testimonials (user_id);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public read (anon JWT only): approved rows. Authenticated users rely on owner policy below.
DROP POLICY IF EXISTS "testimonials_read_approved" ON public.testimonials;
CREATE POLICY "testimonials_read_approved"
  ON public.testimonials
  FOR SELECT
  TO anon
  USING (approved = true);

-- Owners see and manage all their testimonials (including unapproved)
DROP POLICY IF EXISTS "testimonials_owner_all" ON public.testimonials;
CREATE POLICY "testimonials_owner_all"
  ON public.testimonials
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: inserts from the public form go through /api/testimonials/submit (service role).
-- Direct anon INSERT is not allowed (prevents forging user_id).

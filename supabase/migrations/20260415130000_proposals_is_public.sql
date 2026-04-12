-- Allow shareable proposal URLs when is_public is true
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.proposals.is_public IS 'When true, proposal is readable via /proposal/[id] without auth.';

DROP POLICY IF EXISTS "Public read proposals when is_public" ON public.proposals;
CREATE POLICY "Public read proposals when is_public"
  ON public.proposals
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

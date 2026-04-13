ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS signed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signed_by_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signed_ip text DEFAULT NULL;

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proposals_status_check'
      AND conrelid = 'public.proposals'::regclass
  ) THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_status_check
      CHECK (status IN ('draft', 'sent', 'signed', 'paid'));
  END IF;
END $$;

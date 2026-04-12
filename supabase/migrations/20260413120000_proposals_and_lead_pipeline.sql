-- Expand lead pipeline statuses (Kanban)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

UPDATE leads SET status = 'replied' WHERE status = 'in_talks';

ALTER TABLE leads
  ADD CONSTRAINT leads_status_check CHECK (
    status IN (
      'new',
      'contacted',
      'replied',
      'call_booked',
      'proposal_sent',
      'won',
      'lost'
    )
  );

-- AI-generated proposals
CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads (id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_problem text NOT NULL,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposals_user_id_idx ON public.proposals (user_id);
CREATE INDEX IF NOT EXISTS proposals_project_id_idx ON public.proposals (project_id);
CREATE INDEX IF NOT EXISTS proposals_lead_id_idx ON public.proposals (lead_id);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own proposals" ON public.proposals;
CREATE POLICY "Users manage own proposals" ON public.proposals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

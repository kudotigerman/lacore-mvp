-- Lead pipeline status for dashboard
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'new'
  CHECK (status IN ('new', 'contacted', 'in_talks', 'won', 'lost'));

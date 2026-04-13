ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS payment_link text;

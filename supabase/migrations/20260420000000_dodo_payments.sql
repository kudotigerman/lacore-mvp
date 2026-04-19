-- Add Dodo Payments fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dodo_customer_id text,
  ADD COLUMN IF NOT EXISTS dodo_subscription_id text;

-- Deduplication table for webhook events
CREATE TABLE IF NOT EXISTS public.dodo_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.dodo_events ENABLE ROW LEVEL SECURITY;

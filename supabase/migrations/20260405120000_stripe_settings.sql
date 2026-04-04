CREATE TABLE IF NOT EXISTS stripe_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  publishable_key text NOT NULL,
  price_id text,
  payment_type text DEFAULT 'one_time' CHECK (payment_type IN ('one_time', 'subscription')),
  button_text text DEFAULT 'Buy Now',
  connected_at timestamptz DEFAULT now()
);

ALTER TABLE stripe_settings ADD COLUMN IF NOT EXISTS secret_key text;

ALTER TABLE stripe_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own stripe" ON stripe_settings;

CREATE POLICY "own stripe" ON stripe_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

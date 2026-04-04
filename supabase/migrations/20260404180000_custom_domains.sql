CREATE TABLE IF NOT EXISTS custom_domains (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  slug text NOT NULL,
  domain text NOT NULL UNIQUE,
  verified boolean DEFAULT false,
  vercel_domain_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own domains" ON custom_domains;

CREATE POLICY "own domains" ON custom_domains FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

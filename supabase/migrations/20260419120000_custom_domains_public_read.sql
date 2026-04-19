-- Allow public (anon) read access to verified custom domains only.
-- Required for middleware domain routing without service role key.
DROP POLICY IF EXISTS "public read verified domains" ON custom_domains;
CREATE POLICY "public read verified domains" ON custom_domains
  FOR SELECT
  USING (verified = true);

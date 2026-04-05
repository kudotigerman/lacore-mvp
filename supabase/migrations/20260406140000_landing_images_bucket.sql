INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landing-images',
  'landing-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "landing_images_select_public" ON storage.objects;
CREATE POLICY "landing_images_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-images');

DROP POLICY IF EXISTS "landing_images_insert_own" ON storage.objects;
CREATE POLICY "landing_images_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'landing-images'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "landing_images_delete_own" ON storage.objects;
CREATE POLICY "landing_images_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'landing-images'
  AND split_part(name, '/', 1) = auth.uid()::text
);

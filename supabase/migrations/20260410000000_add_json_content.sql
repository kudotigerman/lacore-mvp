ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS json_content jsonb;

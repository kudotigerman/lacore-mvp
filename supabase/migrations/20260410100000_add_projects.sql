CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Project',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE offers ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own projects" ON projects;
CREATE POLICY "Users own projects" ON projects FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS offers_project_id_idx ON offers(project_id);
CREATE INDEX IF NOT EXISTS landing_pages_project_id_idx ON landing_pages(project_id);
CREATE INDEX IF NOT EXISTS leads_project_id_idx ON leads(project_id);

INSERT INTO projects (user_id, name)
SELECT DISTINCT user_id, 'My Project'
FROM offers
WHERE user_id NOT IN (SELECT user_id FROM projects)
ON CONFLICT DO NOTHING;

UPDATE offers o SET project_id = p.id
FROM projects p WHERE p.user_id = o.user_id AND o.project_id IS NULL;

UPDATE landing_pages lp SET project_id = p.id
FROM projects p
JOIN offers o ON o.project_id = p.id
WHERE lp.user_id = o.user_id AND lp.project_id IS NULL;

UPDATE leads l SET project_id = p.id
FROM projects p
JOIN offers o ON o.project_id = p.id
WHERE l.user_id = o.user_id AND l.project_id IS NULL;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS landing_generations_count INTEGER DEFAULT 0;

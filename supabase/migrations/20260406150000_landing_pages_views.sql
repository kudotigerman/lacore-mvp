-- Page view counter (increment via client/API when tracking is wired)
ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS views bigint NOT NULL DEFAULT 0;

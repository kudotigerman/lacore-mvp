ALTER TABLE public.saved_results
DROP CONSTRAINT IF EXISTS saved_results_type_check;

ALTER TABLE public.saved_results
ADD CONSTRAINT saved_results_type_check
CHECK (type IN ('pricing', 'sequence', 'outreach', 'analytics_insights'));

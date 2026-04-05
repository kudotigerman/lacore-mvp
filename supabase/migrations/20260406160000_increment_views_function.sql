-- Atomic view counter for public landing pages (callable with anon key)
CREATE OR REPLACE FUNCTION public.increment_landing_views(page_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.landing_pages
  SET views = COALESCE(views, 0) + 1
  WHERE slug = page_slug;
$$;

REVOKE ALL ON FUNCTION public.increment_landing_views(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_landing_views(text) TO anon, authenticated, service_role;

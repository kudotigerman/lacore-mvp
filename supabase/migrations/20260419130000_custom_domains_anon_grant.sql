-- Grant SELECT to anon role so middleware can read verified domains without service key.
GRANT SELECT ON public.custom_domains TO anon;

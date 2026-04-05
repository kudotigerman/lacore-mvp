-- Apex host only (matches middleware normalizedHost).
UPDATE public.custom_domains
SET domain = REPLACE(domain, 'www.', '')
WHERE domain LIKE 'www.%';

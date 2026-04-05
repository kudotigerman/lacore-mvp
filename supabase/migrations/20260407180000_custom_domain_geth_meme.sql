-- Normalize geth.meme for custom-domain middleware (apex host in DB, verified).
-- If the row does not exist yet, connect the domain in the dashboard first; these UPDATEs are then no-ops until the row exists.
UPDATE public.custom_domains
SET verified = true
WHERE domain IN ('geth.meme', 'www.geth.meme');

UPDATE public.custom_domains
SET domain = 'geth.meme'
WHERE domain = 'www.geth.meme';

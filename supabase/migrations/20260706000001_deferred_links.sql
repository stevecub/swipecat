-- SwipeCat Full Deferred Link Engine
-- Stores short-lived fingerprint records for deferred deep linking

CREATE TABLE public.deferred_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  product_id text NOT NULL,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast fingerprint lookups on first launch
CREATE INDEX idx_deferred_links_fingerprint ON public.deferred_links (fingerprint);
CREATE INDEX idx_deferred_links_created_at ON public.deferred_links (created_at DESC);

-- Only service_role can read/write (edge functions use service_role)
GRANT ALL ON public.deferred_links TO service_role;
ALTER TABLE public.deferred_links ENABLE ROW LEVEL SECURITY;

-- No public access — only edge functions (service_role) can touch this table
CREATE POLICY "Service role only"
  ON public.deferred_links
  USING (false);

-- Auto-cleanup: delete records older than 2 hours to keep the table lean
-- (Handled in the edge function, but this is a safety net)
CREATE OR REPLACE FUNCTION public.cleanup_expired_deferred_links()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.deferred_links
  WHERE created_at < now() - interval '2 hours';
$$;

-- Link stats view for the admin dashboard
CREATE VIEW public.deferred_link_stats AS
SELECT
  COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') AS shares_24h,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') AS shares_7d,
  COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') AS shares_30d,
  COUNT(*) FILTER (WHERE claimed = true AND created_at > now() - interval '24 hours') AS claims_24h,
  COUNT(*) FILTER (WHERE claimed = true AND created_at > now() - interval '7 days') AS claims_7d,
  COUNT(*) FILTER (WHERE claimed = true AND created_at > now() - interval '30 days') AS claims_30d,
  COUNT(*) AS total_shares,
  COUNT(*) FILTER (WHERE claimed = true) AS total_claims
FROM public.deferred_links;

GRANT SELECT ON public.deferred_link_stats TO service_role;

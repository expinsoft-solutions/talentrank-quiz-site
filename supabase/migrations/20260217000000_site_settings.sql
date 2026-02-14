-- Site-wide settings (VSL, branding, etc.). Admin writes; anon can read for public keys.
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'null',
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read (so app can show VSL URL, internal vs external, etc.)
CREATE POLICY "Public read site_settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Only service_role can insert/update (admin uses API with service role or dashboard)
-- No policy for anon/auth insert/update = only service_role can write.

COMMENT ON TABLE public.site_settings IS 'Key-value store for site config: vsl_url, vsl_type, vsl_embed_url, etc.';

-- Seed default VSL: internal page, no embed (admin can change)
INSERT INTO public.site_settings (key, value)
VALUES
  ('vsl_enabled', 'true'),
  ('vsl_type', '"internal"'),
  ('vsl_url', '"/vsl"'),
  ('vsl_embed_url', '""')
ON CONFLICT (key) DO NOTHING;

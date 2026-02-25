-- Stripe integration: settings, payment tracking, and RLS hardening

-- 1. Replace blanket public read on site_settings to protect sensitive Stripe keys.
--    Service role bypasses RLS so admin API routes still have full access.
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;

CREATE POLICY "Public read non-sensitive site_settings"
  ON public.site_settings FOR SELECT
  USING (key NOT IN ('stripe_secret_key', 'stripe_webhook_secret'));

-- 2. Track payment status on assessment attempts
ALTER TABLE public.assessment_attempts
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

-- 3. Seed non-sensitive Stripe defaults (admin fills in the values via panel)
INSERT INTO public.site_settings (key, value)
VALUES
  ('stripe_enabled', 'false'),
  ('stripe_publishable_key', '""'),
  ('stripe_price_id', '""'),
  ('stripe_product_name', '"Advanced TalentRank Report"'),
  ('stripe_product_description', '"Unlock your full cognitive blueprint with detailed insights on blockers, traits, and a personalized action plan."'),
  ('stripe_price_display', '"$97"')
ON CONFLICT (key) DO NOTHING;

-- 4. Seed sensitive keys as empty strings (admin writes real values via admin panel → service role)
INSERT INTO public.site_settings (key, value)
VALUES
  ('stripe_secret_key', '""'),
  ('stripe_webhook_secret', '""')
ON CONFLICT (key) DO NOTHING;

-- Store configurable Claude model for report generation in site_settings.
-- Empty value = use default model in Edge Function.
INSERT INTO public.site_settings (key, value)
VALUES ('report_model', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;


INSERT INTO public.site_settings (key, value)
VALUES ('active_assessment_version', '"v1.0"')
ON CONFLICT (key) DO NOTHING;

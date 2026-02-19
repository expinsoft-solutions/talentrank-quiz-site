-- Store customizable report system prompt in site_settings.
-- Empty value = use default in Edge Function. Admin can set via API or Table Editor.
INSERT INTO public.site_settings (key, value)
VALUES ('report_system_prompt', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;

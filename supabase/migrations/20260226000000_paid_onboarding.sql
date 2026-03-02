INSERT INTO public.site_settings (key, value)
VALUES ('paid_questionnaire', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.assessment_attempts
  ADD COLUMN IF NOT EXISTS paid_responses jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.assessment_attempts.paid_responses IS 'JSON object of questionId -> { answerNumeric?, answerRaw? } for post-purchase onboarding questions';

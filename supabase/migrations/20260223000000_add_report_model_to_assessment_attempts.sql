ALTER TABLE public.assessment_attempts
  ADD COLUMN IF NOT EXISTS report_model text;

COMMENT ON COLUMN public.assessment_attempts.report_model IS 'Claude model used to generate the AI report, for A/B testing and analytics.';

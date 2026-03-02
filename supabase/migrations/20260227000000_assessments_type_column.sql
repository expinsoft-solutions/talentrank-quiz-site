ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'free';

UPDATE public.assessments SET type = 'free' WHERE type IS NULL;

COMMENT ON COLUMN public.assessments.type IS 'free = main quiz; paid = post-purchase onboarding questions';

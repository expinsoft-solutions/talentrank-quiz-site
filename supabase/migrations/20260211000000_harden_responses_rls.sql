-- Add client_token to assessments and responses, enforce ownership, and prevent duplicate responses

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS client_token uuid DEFAULT gen_random_uuid();

ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS client_token uuid;

-- Backfill any missing client_token on existing assessments
UPDATE public.assessments
SET client_token = gen_random_uuid()
WHERE client_token IS NULL;

-- Optional: backfill responses.client_token where possible
UPDATE public.responses r
SET client_token = a.client_token
FROM public.assessments a
WHERE r.assessment_id = a.id
  AND r.client_token IS NULL;

-- Ensure one response per assessment/question pair (Postgres has no IF NOT EXISTS here)
-- First, de-duplicate existing rows by (assessment_id, question_id), keeping the latest row.
DELETE FROM public.responses r
USING public.responses r2
WHERE r.assessment_id = r2.assessment_id
  AND r.question_id = r2.question_id
  AND r.ctid < r2.ctid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'responses_assessment_question_unique'
  ) THEN
    ALTER TABLE public.responses
      ADD CONSTRAINT responses_assessment_question_unique
      UNIQUE (assessment_id, question_id);
  END IF;
END
$$;

-- Tighten RLS: only allow inserts when the client_token matches the assessment's token
DROP POLICY IF EXISTS "anon_insert_responses" ON public.responses;

CREATE POLICY "anon_insert_responses" ON public.responses
  FOR INSERT TO anon
  WITH CHECK (
    client_token IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.assessments a
      WHERE a.id = assessment_id
        AND a.client_token = public.responses.client_token
    )
  );


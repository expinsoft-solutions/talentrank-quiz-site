-- Single source of truth: questionnaire is stored as JSON in public.assessments.
-- Drop legacy sections and questions tables.

DROP POLICY IF EXISTS "anon_select_questions" ON public.questions;
DROP POLICY IF EXISTS "anon_select_sections" ON public.sections;

-- responses.question_id referenced questions; drop FK so we can drop questions
ALTER TABLE public.responses DROP CONSTRAINT IF EXISTS responses_question_id_fkey;

DROP TABLE IF EXISTS public.questions;
DROP TABLE IF EXISTS public.sections;

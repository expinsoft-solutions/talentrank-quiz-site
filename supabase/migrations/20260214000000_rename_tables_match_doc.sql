-- Align table names with requirements doc:
-- Doc's "assessments" = questionnaire definition (id, questionnaire, version, language_key).
-- Our attempt table is renamed to assessment_attempts.

-- 1. Rename current attempts table so we can use "assessments" for the doc's table
ALTER TABLE public.assessments RENAME TO assessment_attempts;

-- 2. Rename questionnaire_versions to assessments (doc's questionnaire-definition table)
ALTER TABLE public.questionnaire_versions RENAME TO assessments;

-- 3. Fix FK: assessment_attempts.questionnaire_version_id referenced questionnaire_versions(id).
--    The constraint still points to the same table (now named assessments). Rename constraint if desired.
ALTER TABLE public.assessments
  RENAME CONSTRAINT questionnaire_versions_version_key TO assessments_version_key;

-- 4. Index for lookups by version
ALTER INDEX IF EXISTS public.idx_questionnaire_versions_version RENAME TO idx_assessments_version;

-- 5. RLS policy: was anon_select_questionnaire_versions on questionnaire_versions (now assessments)
ALTER POLICY "anon_select_questionnaire_versions" ON public.assessments RENAME TO anon_select_assessments;

-- 6. responses.assessment_id: referenced old assessments (attempts). Table is now assessment_attempts.
--    FK follows the table rename. RLS policies on responses reference public.assessments (attempts) -> must now reference assessment_attempts.
DROP POLICY IF EXISTS "anon_insert_responses" ON public.responses;
CREATE POLICY "anon_insert_responses" ON public.responses
  FOR INSERT TO anon
  WITH CHECK (
    client_token IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.assessment_attempts a
      WHERE a.id = assessment_id
        AND a.client_token = public.responses.client_token
    )
  );

DROP POLICY IF EXISTS "anon_update_responses" ON public.responses;
CREATE POLICY "anon_update_responses" ON public.responses
  FOR UPDATE TO anon
  USING (
    client_token IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.assessment_attempts a
      WHERE a.id = assessment_id
        AND a.client_token = public.responses.client_token
    )
  )
  WITH CHECK (
    client_token IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.assessment_attempts a
      WHERE a.id = assessment_id
        AND a.client_token = public.responses.client_token
    )
  );

-- 7. assessment_attempts.questionnaire_version_id: referenced questionnaire_versions(id), now assessments(id). No change needed.

COMMENT ON TABLE public.assessments IS 'Questionnaire definition (doc: assessments): one row per quiz version; questionnaire stored as JSON. version is UUID or semantic version.';
COMMENT ON TABLE public.assessment_attempts IS 'One row per user taking a quiz (attempt). Links to assessments via questionnaire_version_id.';

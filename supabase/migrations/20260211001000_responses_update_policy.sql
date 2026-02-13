-- Allow anon clients to update their own responses (for upsert semantics)

DROP POLICY IF EXISTS "anon_update_responses" ON public.responses;

CREATE POLICY "anon_update_responses" ON public.responses
  FOR UPDATE TO anon
  USING (
    client_token IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.assessments a
      WHERE a.id = assessment_id
        AND a.client_token = public.responses.client_token
    )
  )
  WITH CHECK (
    client_token IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.assessments a
      WHERE a.id = assessment_id
        AND a.client_token = public.responses.client_token
    )
  );


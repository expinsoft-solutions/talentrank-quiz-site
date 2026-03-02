CREATE OR REPLACE FUNCTION public.insert_paid_assessment(p_questionnaire jsonb, p_version text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id bigint;
BEGIN
  SELECT coalesce(max(id), 0) + 1 INTO new_id FROM public.assessments;
  INSERT INTO public.assessments (id, questionnaire, version, language_key)
  VALUES (new_id, p_questionnaire, p_version, 'en');
  RETURN jsonb_build_object('id', new_id, 'version', p_version);
END;
$$;

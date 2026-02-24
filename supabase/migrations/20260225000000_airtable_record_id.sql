ALTER TABLE public.assessment_attempts
  ADD COLUMN IF NOT EXISTS airtable_record_id text;

COMMENT ON COLUMN public.assessment_attempts.airtable_record_id IS 'Airtable record id after export; used to update on re-export instead of creating duplicates.';

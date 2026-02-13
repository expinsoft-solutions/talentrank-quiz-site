-- Store AI-generated personalized report for completed assessments
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS report_text text;

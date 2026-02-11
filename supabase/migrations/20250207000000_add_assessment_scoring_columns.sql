ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS mbti text,
  ADD COLUMN IF NOT EXISTS axis_strengths jsonb,
  ADD COLUMN IF NOT EXISTS cognitive_percentile numeric,
  ADD COLUMN IF NOT EXISTS neuroticism_score numeric,
  ADD COLUMN IF NOT EXISTS self_sabotage_scores jsonb,
  ADD COLUMN IF NOT EXISTS optimal_env_scores jsonb;

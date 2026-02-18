CREATE TABLE IF NOT EXISTS public.user_quiz_attempt_counts (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_key text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_quiz_attempt_counts_pkey PRIMARY KEY (user_id, quiz_key)
);

CREATE INDEX IF NOT EXISTS idx_user_quiz_attempt_counts_user_id ON public.user_quiz_attempt_counts (user_id);

COMMENT ON TABLE public.user_quiz_attempt_counts IS 'Tracks completed attempt count per user per quiz type (e.g. v1.0, talentrank)';

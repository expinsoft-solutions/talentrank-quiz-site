CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  version text NOT NULL,
  status text DEFAULT 'started' CHECK (status = ANY (ARRAY['started', 'completed', 'cancelled'])),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_time_seconds int4,
  raw_payload jsonb,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.sections (
  id text NOT NULL,
  name text,
  order_index int4,
  is_timed bool,
  time_limit_seconds int4,
  purpose text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.questions (
  id text NOT NULL,
  section_id text REFERENCES public.sections(id) ON DELETE CASCADE,
  text text,
  type text,
  dimension text,
  reverse_scored bool,
  weight numeric,
  correct_answer text,
  active bool,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id text,
  answer_raw text,
  answer_numeric numeric,
  is_correct bool,
  time_taken_seconds int4,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

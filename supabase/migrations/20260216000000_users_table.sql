-- public.users: one row per assessment "user" (created on start-assessment).
-- id is uuid; update-assessment-user fills email, first_name, device.
-- Unique on email: one row per email; reuse may require different flow (e.g. upsert by email).

CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NULL,
  first_name text NULL,
  device text NULL,
  created_at timestamptz NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email)
);

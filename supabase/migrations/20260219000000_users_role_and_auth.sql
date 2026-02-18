ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_key
  ON public.users (auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_email_lower_idx
  ON public.users (LOWER(email)) WHERE email IS NOT NULL;

COMMENT ON COLUMN public.users.role IS 'user or admin; admins must have auth_user_id set';
COMMENT ON COLUMN public.users.auth_user_id IS 'Links to Supabase Auth when user can log in (e.g. admins)';

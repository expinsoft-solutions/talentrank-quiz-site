# Admin Portal Setup

## Prerequisites

- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (needed for admin API routes)
- Supabase Auth enabled with email/password sign-in

## 1. Run migrations

```bash
npx supabase db push
```

## 2. Create your first admin (no portal access yet)

From repo root, with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `web/.env`:

```bash
cd web && ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword npm run admin:create-first
```

Or with positional args:
```bash
cd web && npm run admin:create-first your@email.com yourpassword
```

Then log in at `/admin/login`.

**Alternative (manual):** Create user in Supabase Dashboard → Authentication → Add user, then run:
```sql
INSERT INTO public.users (email, role, auth_user_id)
SELECT email, 'admin', id FROM auth.users WHERE email = 'your-admin@example.com'
ON CONFLICT (email) DO UPDATE SET role = 'admin', auth_user_id = EXCLUDED.auth_user_id;
```

## 3. Access

- **Login:** `/admin/login`
- **Questions:** `/admin/questions` — edit questionnaire (sections, questions, options)
- **Submissions:** `/admin/submissions` — view user assessment attempts

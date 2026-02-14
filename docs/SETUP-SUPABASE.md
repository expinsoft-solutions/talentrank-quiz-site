# Supabase setup for TalentRank quiz

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**.
3. Choose an organization (or create one).
4. Set:
   - **Name**: e.g. `talentrank` or `talentrank-quiz`
   - **Database password**: save it somewhere safe (needed for direct DB access).
   - **Region**: pick one close to your users.
5. Click **Create new project** and wait for it to finish provisioning.

---

## 2. Get your project URL and keys

1. In the Supabase dashboard, open your project.
2. Go to **Project Settings** (gear icon) → **API**.
3. Copy:
   - **Project URL** (e.g. `https://xxxxxxxx.supabase.co`) → use as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key (under "Project API keys") → use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (secret; only for server-side) → use as `SUPABASE_SERVICE_ROLE_KEY` in API routes if you need to bypass RLS or call admin APIs.

For the Next.js app you only need the **anon** key for client-side (e.g. calling Edge Functions). Use **service_role** only in server-side code (API routes) and never expose it to the browser.

---

## 3. Add env vars to the Next.js app

In `web/` create a `.env.local` file (and add it to `.gitignore` if not already):

```env
# Supabase (from Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: for server-side scoring / admin (API routes only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Restart the dev server after changing env vars.

---

## 4. Install the Supabase client (when you implement)

From the `web/` directory:

```bash
npm install @supabase/supabase-js
```

Then create a browser client, e.g. `web/src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Use this client to call Edge Functions (e.g. scoring) from the app or from API routes.

---

## 5. Optional: Supabase CLI (local dev + Edge Functions)

You already have a `supabase/` folder with `config.toml`. To use the CLI:

1. Install: [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli) (e.g. `npm i -g supabase` or use npx).
2. Log in: `supabase login`.
3. Link this repo to your project: `supabase link --project-ref your-project-ref` (ref is in the project URL: `https://xxxxx.supabase.co` → `xxxxx`).
4. Run locally: `supabase start` (Docker required) for local DB + Auth + Studio.
5. Edge Functions live under `supabase/functions/`; deploy with `supabase functions deploy <name>`.

For your plan (Airtable as main DB, Supabase only for scoring), you may only need the **hosted project** (steps 1–4) and an Edge Function for scoring; the CLI is optional until you add Edge Functions.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create project at supabase.com |
| 2 | Copy Project URL + anon key from **Settings → API** |
| 3 | Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `web/.env.local` |
| 4 | When implementing: `npm install @supabase/supabase-js` in `web/` and create `src/lib/supabase.ts` |

After that, the app can call your Supabase project (e.g. scoring Edge Function) using the anon key.

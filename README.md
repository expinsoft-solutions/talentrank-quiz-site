# TalentRank Quiz

A talent-assessment platform: candidates take a scored quiz/questionnaire,
and admins manage questions, scoring, and results through a dedicated
admin portal.

## What it does

- Serves a candidate-facing quiz flow driven by a configurable question
  bank (free and paid questionnaire tiers)
- Scores submissions through a dedicated scoring engine
- Provides an admin portal for managing questions, reviewing results, and
  administering access
- Persists data and auth through Supabase (Postgres, Auth, migrations,
  edge functions)

## Tech stack

- **Next.js** + **TypeScript** — web app (`web/`)
- **Supabase** — Postgres database, authentication, migrations, edge
  functions (`supabase/`)
- **Vitest** — testing

## Project structure

```
.
├── web/          # Next.js application
├── supabase/     # Migrations, edge functions, seed data
├── docs/         # Setup and implementation notes (admin, scoring engine)
└── requirements/ # Product/schema reference docs
```

## Getting started

```bash
cd web
npm install
cp .env.example .env.local   # fill in Supabase URL + keys
npx supabase db push
npm run dev
```

See [`docs/ADMIN-SETUP.md`](./docs/ADMIN-SETUP.md) for creating the first
admin account and [`docs/SETUP-SUPABASE.md`](./docs/SETUP-SUPABASE.md) for
full Supabase configuration.

## Accessibility

Built with accessibility best practices in mind, targeting WCAG 2.1 AA.

## License

MIT — see [LICENSE](./LICENSE).

# Questionnaire JSON schema (DB)

The questionnaire is stored as JSON for flexibility and to match the structure used in the requirements docs.

## Satisfying “JSON structure, dynamic and flexible”

The requirement is satisfied as follows:

- **Questionnaire is a JSON structure:** It lives in `assessments.questionnaire` (jsonb). One row per quiz version; no normalized `sections`/`questions` tables are required for the running app.
- **Single source of truth:** The canonical questionnaire is the JSON (in the DB). Use `requirements/questionnaire.json` with `{ free: [...], paid: [...] }` and load via `npm run questionnaire:load`.
- **Bootstrap:** Ensure `requirements/questionnaire.json` has content, then run `cd web && npm run questionnaire:load` to push into `assessments`. Export: `npm run questionnaire:export` reads from `assessments` and writes that file.
- **Dynamic/flexible:** Add sections, question types, or fields in the JSON without DB migrations.

## Compliance with requirements docs

| Doc | Implemented | Notes |
|-----|-------------|--------|
| **example-sql-structure: `assessments`** (questionnaire definition) | Yes | We have table `assessments`: id, created_at, questionnaire (jsonb), version (varchar 36, unique), language_key (default 'en'). Attempts table is `assessment_attempts`. |
| **example-sql-structure: `user_assessments`** | Partial | Doc has a separate table (user_id, assessment_id→questionnaire, answers, scores_in_percentage, certificate_status, version_name). We use `assessment_attempts` (one row per attempt) + `responses` (per-question answers). No `certificate_status`, `version_name`, or single `scores_in_percentage` column. |
| **example-assessment-structure.json** (JSON shape) | Different field names | Doc uses section **title**, question **statement**, **negative**, **options**. We use **name**, **text**, **reverse_scored**, and extra fields (id, dimension, weight, correct_answer, active) for current scoring. Parser could be extended to accept doc shape (title/statement/negative/options) and map to internal shape. |

## Table: `assessments` (doc’s questionnaire-definition table)

Matches the doc: one row per **quiz version**, with the full questionnaire in a JSON column. `version` is a UUID or semantic version for the quiz.

| Column           | Type         | Description                                      |
|------------------|-------------|--------------------------------------------------|
| `id`             | bigint PK   | Auto-increment                                  |
| `created_at`     | timestamptz | Default now() (doc: `createdAt`)                 |
| `questionnaire`  | jsonb       | Full questionnaire (doc: text; we use jsonb)    |
| `version`        | varchar(36) | UUID or semantic version (e.g. v1.0), UNIQUE     |
| `language_key`   | varchar(5)  | Default `en`                                    |

## Table: `assessment_attempts` (one row per user taking a quiz)

This is the **attempt** table (doc’s “user_assessments” style). It has:

- `questionnaire_version_id` (FK to `assessments.id`) — which questionnaire version was used.
- Plus: user_id, status, started_at, completed_at, client_token, mbti, axis_strengths, etc.

Answers are stored in the `responses` table (per-question).

## Questionnaire JSON shape

`questionnaire` is an object with `free` and `paid` arrays of sections:

```json
{
  "free": [ /* main quiz sections */ ],
  "paid": [ /* post-purchase onboarding sections */ ]
}
```

Each section:

```json
{
  "id": "personality_wiring",
  "name": "Personality Wiring",
  "order_index": 1,
  "isTimed": false,
  "time_limit_seconds": null,
  "purpose": "Big Five → MBTI-style type",
  "questions": [
    {
      "id": "P1",
      "statement": "I am the life of the party.",
      "type": "likert",
      "dimension": "EI",
      "reverseScored": false,
      "weight": 1,
      "correct_answer": null,
      "active": true,
      "options": ["Very Inaccurate", "Moderately Inaccurate", "Neutral", "Moderately Accurate", "Very Accurate"]
    }
  ]
}
```

Question fields: `statement` (or legacy `text`), `reverseScored` (or legacy `reverse_scored`), `options` (array of scale labels for likert; optional, falls back to section defaults).

You can extend this (e.g. add `options` for MCQ, or different types) without changing the DB schema. The app and edge functions read only from this JSON. The legacy `sections` and `questions` tables have been removed; the questionnaire in `assessments` is the single source of truth.

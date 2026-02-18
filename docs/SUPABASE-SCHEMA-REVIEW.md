# Supabase schema review

Your schema aligns well with the assessment flow and the submission payload. Below is what works and optional improvements.

---

## What works

| Table | Notes |
|-------|------|
| **users** | `email`, `first_name`, `device` match the payload. `id` for linking. |
| **assessments** | `version`, `started_at`, `completed_at`, `status` fit. `total_time_seconds` for cognitive time; `raw_payload` for full JSON. `user_id` FK to users is correct. |
| **sections** | Good for personality vs cognitive. `order_index`, `isTimed`, `time_limit_seconds` support section config. |
| **questions** | `section_id` → sections, `type` (likert/mcq/text), `reverse_scored` for personality keying, `correct_answer` for cognitive scoring. |
| **responses** | `assessment_id`, `question_id`, `answer_numeric`, `time_taken_seconds` match. `answer_raw` for text; `is_correct` for cognitive. |

Section is derivable as `questions.section_id`, so no need for `section` on `responses`.

---

## Suggestions

### 1. Indexes (performance)

- **responses**: `(assessment_id)` — list all responses for an assessment.
- **responses**: `(assessment_id, question_id)` — lookup/upsert one response per question; consider UNIQUE so each question is answered once per assessment.
- **assessments**: `(user_id, started_at DESC)` — “my assessments” list.
- **assessments**: `(status)` if you filter by status often.

### 2. Optional constraints

- **users.device**: `CHECK (device IN ('desktop','mobile','tablet'))` to match app types.
- **responses**: `UNIQUE (assessment_id, question_id)` so one row per question per assessment (if your app logic assumes that).

### 3. Question type

- You have `likert`, `mcq`, `text`. Cognitive is numeric input; you can store it as `answer_numeric` and keep type as `text`, or add a type like `numeric` if you want to distinguish it in the schema.

### 4. Nullability

- **assessments.user_id**: Nullable is fine if you allow anonymous attempts. If every assessment must be tied to a user, make it `NOT NULL`.

---

## Optional migration (indexes + constraints)

Run in Supabase SQL Editor if you want these changes. Safe to skip or adapt.

```sql
-- Indexes
CREATE INDEX IF NOT EXISTS idx_responses_assessment_id ON public.responses (assessment_id);
CREATE INDEX IF NOT EXISTS idx_responses_assessment_question ON public.responses (assessment_id, question_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user_started ON public.assessments (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON public.assessments (status);

-- Optional: one response per question per assessment
-- ALTER TABLE public.responses
--   ADD CONSTRAINT responses_assessment_question_unique UNIQUE (assessment_id, question_id);

-- Optional: restrict device values
-- ALTER TABLE public.users
--   ADD CONSTRAINT users_device_check CHECK (device IS NULL OR device IN ('desktop', 'mobile', 'tablet'));
```

---

## Mapping payload → schema

When you submit from the app:

1. **User** → upsert `users` (by email), get `user_id`.
2. **Assessment** → insert `assessments` with `user_id`, `version`, `started_at`, `completed_at`, `status = 'completed'`, `total_time_seconds` (from cognitive), `raw_payload` = full JSON.
3. **Responses** → for each item in `responses[]`, insert into `responses` with `assessment_id`, `question_id`, `answer_numeric` (= `answer`), `time_taken_seconds` (= `time_taken` or NULL).

Section is not stored on `responses`; use `questions.section_id` when you need it (e.g. for scoring by section).

---

## Summary

Schema is in good shape for the current flow. Adding the indexes above (and optionally the UNIQUE and CHECK) will improve queries and data consistency. No breaking changes required.

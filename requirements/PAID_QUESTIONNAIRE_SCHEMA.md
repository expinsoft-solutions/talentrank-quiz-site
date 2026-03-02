# Questionnaire Schema (Free + Paid)

Questionnaires are stored in the `assessments` table as a single row with `{ free, paid }`:

```json
{
  "free": [ /* main quiz sections */ ],
  "paid": [ /* post-purchase onboarding sections */ ]
}
```

Edit `requirements/questionnaire.json` and load via:

```bash
cd web && npm run questionnaire:load
```

This updates the latest assessment row with the unified questionnaire.

## Structure

Each variant (`free` or `paid`) is an array of sections. Each section has:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique section identifier |
| `name` | string | yes | Display name |
| `order_index` | number | yes | Order (1, 2, 3…) |
| `isTimed` | boolean | no | Whether section is timed |
| `time_limit_seconds` | number | no | Seconds if timed |
| `purpose` | string | no | Optional description |
| `enabled` | boolean | no | Default `true`; `false` hides section |
| `questions` | array | yes | Array of question objects |

## Question types

- **`likert`** – 5-point scale (Strongly Disagree → Strongly Agree). Use `reverseScored: true` for negative-keyed items.
- **`short_answer`** or **`text`** – Free text input.

## Question object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique question ID |
| `statement` or `text` | string | yes | Question text |
| `type` | string | yes | `likert`, `short_answer`, or `text` |
| `dimension` | string | no | Optional grouping |
| `reverseScored` | boolean | no | For likert only; flip scale |
| `weight` | number | no | Optional |
| `correct_answer` | string | no | Unused for paid |
| `active` | boolean | no | Default `true`; `false` hides question |
| `options` | array | no | For non-likert types (e.g. mcq) |

## API

- `GET /api/quiz` – free quiz (parses `questionnaire.free`)
- `GET /api/quiz?type=paid` – paid quiz (parses `questionnaire.paid`)
- `/onboarding` – uses paid questionnaire

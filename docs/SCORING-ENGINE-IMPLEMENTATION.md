# Scoring Engine — Full Implementation Guide

This document describes how to implement and extend the scoring engine end-to-end: data flow, formulas, persistence, and file-by-file steps.

---

## 1. Scale: 5-point vs 7-point

**Question booklet (QUESTION BANK)** specifies **5-point** Likert for all Likert sections:

| Section              | Scale   | Labels (example) |
|----------------------|--------|--------------------|
| Personality Wiring   | 5-point | 1=Very Inaccurate … 5=Very Accurate |
| Self-Sabotage        | 5-point | 1=Never … 5=Very Often |
| Optimal Environment  | 5-point | 1=Strongly Disagree … 5=Strongly Agree |

**Current app:** PersonalitySection uses a **7-point** Agree/Disagree scale in the UI.

**Recommendation:**  
- **Scoring engine** should support **configurable scale** (e.g. `LIKERT_SCALE_MAX = 5` or `7`) so you can align with the booklet (5) or keep 7.  
- **Formulas:** For 5-point: `reverse = 6 - raw`, midpoint per item = 3, so dimension midpoint = `n * 3`. For 7-point: `reverse = 8 - raw`, midpoint per item = 4, so dimension midpoint = `n * 4`.  
- If you switch the **UI** to 5-point to match the booklet, set `LIKERT_SCALE_MAX = 5` in the scorer and use the 5-point formulas below everywhere.

---

## 2. End-to-end flow

Scoring runs in a **Supabase Edge Function** (`score-assessment`). The Next.js complete route invokes it and returns the result.

```
User finishes last section
    → Frontend calls POST /api/assessments/[assessmentId]/complete
    → Next.js complete route:
        1. Calls Supabase Edge Function: POST /functions/v1/score-assessment with { assessmentId }
        2. Returns the function’s JSON response to the client
    → Edge Function (score-assessment):
        1. Fetches responses and questions from Supabase
        2. Computes total_time_seconds, completed_at
        3. Calls scoreAssessment(responses, questions)
        4. Updates assessments: status, completed_at, total_time_seconds, mbti, axis_strengths, etc.
        5. Returns JSON: { mbti, axisStrengths, iqPercentile, neuroticismScore?, selfSabotageScores?, optimalEnvScores? }
    → Frontend shows result (and/or redirects to report)
```

**Deploy the Edge Function:** `supabase functions deploy score-assessment` (requires Supabase CLI and `SUPABASE_SERVICE_ROLE_KEY` in Next.js for invocation).

Scorers are **pure functions** inside the Edge Function: they receive `responses` and `questions` arrays and return scores. The web app’s `lib/scoring/*` is kept in sync for unit tests and optional local fallback.

---

## 3. Personality scoring (Big Five → MBTI-style)

**Section:** `personality_wiring`.  
**Scale:** Configurable; booklet = 5-point. Below: **5-point** (same logic applies for 7-point with different constants).

### 3.1 Constants (5-point, from booklet)

- **Scale:** 1–5.
- **Reverse:** `scored = 6 - raw` (so 1→5, 5→1).
- **Midpoint per item:** 3 (middle of 1–5).
- **Per dimension (e.g. 8 items):** min = 8×1 = 8, max = 8×5 = 40, **midpoint = 8×3 = 24**.
- **Letter:** Score > midpoint ⇒ first letter (E, N, F, J); else second (I, S, T, P).
- **Strength (booklet):** `|Score - 24| / 16 × 100%` for 8 items (16 = max distance from 24, i.e. 40-24 or 24-8).

### 3.2 Dimensions and MBTI mapping

| DB dimension | MBTI axis | High score ⇒ |
|--------------|-----------|----------------|
| EI           | E / I     | E (Extraversion) |
| SN           | N / S     | N (Intuition) |
| TF           | T / F     | F (Feeling; high agreeableness) |
| JP           | J / P     | J (Judging) |
| NEURO        | (separate)| Stress resilience; not part of 4-letter type |

### 3.3 Step-by-step algorithm

1. **Filter:** Keep only questions with `section_id === 'personality_wiring'` and `dimension` in `{ EI, SN, TF, JP, NEURO }`.
2. **Join:** For each response, get the matching question (by `question_id`).
3. **Per response:**
   - `raw = answer_numeric` (clamp to 1–5 for 5-point, or 1–7 for 7-point).
   - `scored = reverse_scored ? (scaleMax + 1 - raw) : raw`.  
     - 5-point: `scaleMax = 5` → reverse = `6 - raw`.  
     - 7-point: `scaleMax = 7` → reverse = `8 - raw`.
   - Add `scored * (weight ?? 1)` to the dimension’s sum; increment count.
4. **Per MBTI axis (EI, SN, TF, JP):**
   - `midpoint = count * scaleMid` (5-point: scaleMid=3 → midpoint = count×3; 7-point: scaleMid=4 → count×4).
   - `score = sum` (already computed).
   - **Letter:** `score > midpoint` ⇒ first letter (E, N, F, J), else second (I, S, T, P).
   - **Strength:** `maxRange = count * (scaleMax - scaleMid)` (e.g. 8×(5-3)=16 for 5-point 8 items).  
     `strength = round((|score - midpoint| / maxRange) * 100)`, clamp 0–100.
5. **NEURO:** Do not add to MBTI string. Optionally report as 0–100: `neuroticismScore = round((sum / (count * scaleMax)) * 100)` (higher = more neurotic).

### 3.4 Edge cases

- **Missing response for a question:** Skip that question in the sum; use actual `count` for midpoint and strength (so midpoint is based on answered items only).
- **No responses for a dimension:** Return default letter (e.g. second letter: I, S, T, P) and strength 0.
- **Tie at midpoint:** Booklet says "Score > midpoint" ⇒ first letter; so score === midpoint ⇒ second letter.
- **Invalid answer_numeric (null, out of range):** Clamp to 1–scaleMax or skip that response.

### 3.5 Output

- **mbti:** 4-character string, e.g. `"INTJ"`.
- **axisStrengths:** `{ EI: number, SN: number, TF: number, JP: number }` (0–100).
- **neuroticismScore:** 0–100 (optional).

---

## 4. Cognitive scoring

**Section:** `cognitive_architecture`.  
**Purpose:** IQ/processing estimate (e.g. ICAR-16 style).  
**When:** Only when cognitive section is enabled and questions have `correct_answer` set.

### 4.1 Algorithm

1. Filter questions to `section_id === 'cognitive_architecture'`.
2. For each response with matching question:
   - Compare `answer_numeric` (or `answer_raw` if needed) to `question.correct_answer`.
   - If `correct_answer` is numeric: `is_correct = (answer_numeric === Number(correct_answer))` (with tolerance for floating point if needed).
   - If string/multiple choice: normalize and compare.
3. **Raw score:** Count of correct answers (or sum of weights if you use weighted items).
4. **Percentile:**  
   - **Stub (current):** `iqPercentile = round((correctCount / totalQuestions) * 100)`.  
   - **Later (norming):** Use a lookup table or formula from your norming study: raw score → percentile.

### 4.2 Optional: store is_correct per response

If your schema has `responses.is_correct` (boolean), update it when scoring so you can analyze item-level performance later.

### 4.3 Output

- **iqPercentile:** 0–100 (stub = % correct until norming).
- Optionally: **cognitiveRawScore**, **cognitiveBand** (e.g. low/medium/high).

---

## 5. Other sections (Self-Sabotage, Optimal Environment)

**Sections:** `self_sabotage`, `optimal_environment`.  
**Scale:** 5-point (booklet). Same Likert logic as personality: reverse-score, sum by dimension.

### 5.1 Dimensions (from seed/booklet)

- **Self-Sabotage:** perfectionism, impostor, self_handicapping, validation_seeking, avoidance (etc.).
- **Optimal Environment:** autonomy, pace, social, risk, work_mode (etc.).

### 5.2 Algorithm

- Reuse the same pattern as personality: filter by section, group by `dimension`, reverse-score, sum.  
- **Output:** Subscale scores per dimension (e.g. `selfSabotageScores: { perfectionism: number, ... }`, `optimalEnvScores: { autonomy: number, ... }`).  
- No MBTI letter; use for report narrative or charts.

### 5.3 Implementation

- Add `lib/scoring/self-sabotage.ts` and `lib/scoring/optimal-environment.ts` (or one `lib/scoring/subscales.ts` that scores any likert section by dimension).  
- In `scoreAssessment`, call these with the same `responses` and `questions`; merge subscale scores into the result object and/or persist them.

---

## 6. Short Answer

**Section:** `short_answer`.  
No numeric scoring. Store `answer_raw` only; use for AI report personalization or qualitative analysis. No change needed in scoring engine beyond ensuring responses are saved (already done in your flow).

---

## 7. Persisting results

### Option A: Columns on `assessments`

Add columns:

- `mbti` (text, nullable)
- `axis_strengths` (jsonb, nullable)
- `cognitive_percentile` (numeric, nullable)
- `neuroticism_score` (numeric, nullable)
- Optionally: `self_sabotage_scores` (jsonb), `optimal_env_scores` (jsonb)

After calling `scoreAssessment`, update the assessment row with these values so you can show results on a “report” page without recomputing.

### Option B: `assessment_results` table

- `id`, `assessment_id` (FK), `mbti`, `axis_strengths` (jsonb), `cognitive_percentile`, `neuroticism_score`, `computed_at`, and any subscale columns.

One row per assessment; the complete route inserts or updates it after scoring.

### Recommendation

Start with **Option A** (columns on `assessments`) for simplicity. Migrate to a separate `assessment_results` table later if you need versioning or multiple result sets per assessment.

---

## 8. File structure and implementation checklist

### Existing files (already in place)

- `web/src/lib/scoring/personality.ts` — `scorePersonality(responses, questions)`; currently 7-point; can add scale config.
- `web/src/lib/scoring/index.ts` — `scoreAssessment(responses, questions)`; calls personality + cognitive stub.
- `web/app/api/assessments/[assessmentId]/complete/route.ts` — Fetches data, updates status, calls `scoreAssessment`, returns JSON.

### To implement / extend

| Step | Task | File(s) |
|------|------|--------|
| 1 | Add scale config (5 vs 7) to personality scorer; use booklet formulas for 5-point | `lib/scoring/personality.ts` |
| 2 | (Optional) Add DB migration: columns on `assessments` for mbti, axis_strengths, cognitive_percentile, neuroticism_score | `supabase/migrations/` or SQL in docs |
| 3 | After scoring, persist result to `assessments` (or assessment_results) | `complete/route.ts` |
| 4 | Add cognitive scorer module when cognitive section is enabled; norming later | `lib/scoring/cognitive.ts` |
| 5 | Add subscale scorers for self_sabotage and optimal_environment; merge into result | `lib/scoring/subscales.ts` or separate files |
| 6 | Unit tests for scorePersonality (and others) with fixed responses/questions | `lib/scoring/__tests__/` or `src/test/` |

### Personality scorer: 5-point constants (booklet)

In `personality.ts`, to align with booklet:

- `SCALE_MAX = 5`
- `SCALE_MID = 3`
- Reverse: `scored = 6 - raw`
- Midpoint per dimension: `count * 3`
- Strength: `|score - midpoint| / (count * (5 - 3)) * 100` = `|score - midpoint| / (count * 2) * 100`

(If you keep 7-point in the UI, keep `SCALE_MAX = 7`, `SCALE_MID = 4`, reverse = `8 - raw`; just ensure the **UI sends 1–7** and the **scorer uses 7** so they match.)

---

## 9. Testing

- **Unit tests:**  
  - Build minimal `responses` and `questions` arrays (e.g. 8 EI items, half reverse-scored; all 4s → expect midpoint; all 5s → expect E and high strength).  
  - Test reverse scoring: one item raw=1, reverse=true → scored=5.  
  - Test missing dimension → default letter and 0 strength.  
- **Integration:** Call complete API with a known assessment that has fixed responses; assert returned `mbti` and `axisStrengths` (and optional DB columns if persisted).

---

## 10. Summary

| Section | Scale | Output | Implemented |
|---------|-------|--------|-------------|
| personality_wiring | 5 or 7-point | mbti, axisStrengths, neuroticismScore | Yes (7-point); add 5-point config if aligning with booklet |
| cognitive_architecture | N/A (correct/incorrect) | iqPercentile (stub) | Stub in index.ts |
| self_sabotage / optimal_environment | 5-point | Subscale scores | Not yet; add when needed |
| short_answer | — | — | No scoring; store raw only |

**Full implementation** = personality (with chosen scale) + cognitive stub + optional persistence + optional subscales + tests. The rest is extending the same patterns (filter by section/dimension, reverse-score, sum, then map to your output format).

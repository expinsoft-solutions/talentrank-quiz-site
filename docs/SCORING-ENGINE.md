# Scoring Engine Design

## Overview

The scoring engine runs **server-side** when an assessment is completed (`POST /api/assessments/[id]/complete`). It:

1. Loads all **responses** and **questions** for the assessment from the DB.
2. Scores by **section** (personality_wiring → MBTI; cognitive_architecture → percentile; other sections as needed).
3. Returns (and optionally persists) **MBTI type**, **axis strengths**, **cognitive percentile**, and any other outputs.

---

## 1. Where it runs

- **API route:** `web/app/api/assessments/[assessmentId]/complete/route.ts`
- **Scoring logic:** Pure functions in `web/src/lib/scoring/` (no DB inside scorers; pass in responses + questions).
- **Data flow:** Complete route fetches responses + questions → calls `scoreAssessment(responses, questions)` → returns result, optionally writes to `assessments` or a `results` table.

---

## 2. Inputs

| Source | Data |
|--------|------|
| **responses** | `question_id`, `answer_numeric`, `answer_raw`, `time_taken_seconds` |
| **questions** | `id`, `section_id`, `type`, `dimension`, `reverse_scored`, `weight`, `correct_answer` |

Join responses to questions by `question_id` to get dimension, reverse_scored, etc. per response.

---

## 3. Personality (Big Five → MBTI-style)

**Section:** `personality_wiring`. **Scale:** 7-point (1 = Strongly Disagree … 7 = Strongly Agree).

### 3.1 Dimensions and MBTI mapping

| Dimension (DB) | MBTI axis | Logic |
|----------------|-----------|--------|
| EI | E / I | Sum score > midpoint ⇒ E |
| SN | N / S | Sum score > midpoint ⇒ N |
| TF | T / F | Sum score > midpoint ⇒ F (high agreeableness), else T |
| JP | J / P | Sum score > midpoint ⇒ J |
| NEURO | (separate) | Stress resilience metric; not part of 4-letter type |

### 3.2 Per-dimension scoring

1. Filter responses to `section_id = 'personality_wiring'` and match to questions with `dimension` in `{ EI, SN, TF, JP, NEURO }`.
2. For each response:
   - **Raw value** = `answer_numeric` (1–7).
   - **Scored value** = `reverse_scored ? (scaleMax + 1 - raw) : raw`.  
     For 7-point scale: `scaleMax = 7` → reverse = `8 - raw`.
3. **Dimension score** = sum of (scored value × weight) for all items in that dimension.  
   (If weight is always 1, just sum scored values.)
4. **Midpoint** = (number of items × scaleMax + 1) / 2.  
   E.g. 8 items, 7-point: midpoint = 8×4 = 32 (or use (min+max)/2 per dimension).
5. **Letter:** Score > midpoint ⇒ first letter (E, N, F, J); else second (I, S, T, P).  
   For TF, doc says “High = F, Low = T”, so same rule: score > midpoint ⇒ F.
6. **Axis strength** = how far from midpoint (e.g. 0–100).  
   Formula: `|score - midpoint| / (max_possible - midpoint) * 100`, or clamp and express as percentage.

### 3.3 Output

- **mbti:** 4 letters, e.g. `"INTJ"`.
- **axisStrengths:** `{ EI: number, SN: number, TF: number, JP: number }` (e.g. 0–100).
- **neuroticismScore** (optional): raw or 0–100 for stress resilience.

---

## 4. Cognitive (when enabled)

**Section:** `cognitive_architecture`. **Type:** numeric or multiple choice; compare to `correct_answer`.

1. Filter responses to `section_id = 'cognitive_architecture'`.
2. For each response, set `is_correct` = (answer matches `question.correct_answer`).  
   Store in DB if you have an `is_correct` column.
3. **Raw score** = count correct (or sum of weights if used).
4. **Percentile / band:**  
   - Either: map raw score to a percentile from a lookup table or formula (based on norming).  
   - Or: return raw score and “band” (e.g. low / medium / high) for now; add norming later.

Output: **iqPercentile** (0–100) or **cognitiveBand**.

---

## 5. Other sections (Self-Sabotage, Optimal Environment, Short Answer)

- **Self-sabotage / Optimal environment:** Can be scored by dimension (e.g. perfectionism, autonomy) the same way as personality: filter by section and dimension, reverse-score, sum. Output subscale scores for the report; no MBTI letter.
- **Short answer:** No numeric scoring; store `answer_raw` for AI/report personalization later.

---

## 6. Storing results

**Option A – columns on `assessments`**

- `mbti` (text), `axis_strengths` (jsonb), `cognitive_percentile` (numeric), `neuroticism_score` (numeric).

**Option B – `assessment_results` table**

- `assessment_id`, `mbti`, `axis_strengths` (jsonb), `cognitive_percentile`, `neuroticism_score`, `computed_at`.

Use one approach so the complete route can read/write in one place.

---

## 7. Implementation steps

1. **Create `lib/scoring/personality.ts`**  
   - `scorePersonality(responses, questions)` using only `personality_wiring` questions.  
   - Returns `{ mbti, axisStrengths, neuroticismScore? }`.  
   - Use scale = 7, reverse = `8 - raw`, midpoint = (n × 4) for n items (4 = middle of 1–7).

2. **Create `lib/scoring/cognitive.ts`** (when cognitive is enabled)  
   - `scoreCognitive(responses, questions)` using only `cognitive_architecture` questions.  
   - Returns `{ rawScore, correctCount, iqPercentile? }`.  
   - Percentile can be a stub (e.g. rawScore / total * 100) until you have norming.

3. **Create `lib/scoring/index.ts`**  
   - `scoreAssessment(responses, questions, options?)`  
   - Calls personality scorer, optionally cognitive; merges outputs; returns one result object.

4. **Wire complete route**  
   - Fetch responses + questions (with section_id, dimension, reverse_scored, weight, correct_answer).  
   - Call `scoreAssessment(responses, questions)`.  
   - Return JSON; optionally update `assessments` (or `assessment_results`) with the result.

5. **Optional: persist results**  
   - Add columns or table and write `mbti`, `axis_strengths`, `cognitive_percentile` after scoring.

---

## 8. Formula reference (7-point scale)

- **Scale:** 1–7 (Strongly Disagree … Strongly Agree).
- **Reverse:** `scored = 8 - answer_numeric`.
- **Dimension score:** Sum of scored values for items in that dimension (with weight if needed).
- **Midpoint (per dimension):** If all items are 1–7, min = n×1, max = n×7, midpoint = n×4.
- **Letter:** score > midpoint ⇒ first letter (E,N,F,J), else second (I,S,T,P).
- **Strength:** e.g. `Math.round((Math.abs(score - midpoint) / (max - midpoint)) * 100)`.

This keeps the engine testable (pure functions), DB-agnostic in the scorers, and easy to extend (add sections or dimensions in one place).

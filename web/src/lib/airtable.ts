import { createAdminClient } from '@/lib/supabase/admin';

const AIRTABLE_API = 'https://api.airtable.com/v0';

export interface ExportResult {
  ok: boolean;
  airtableRecordId?: string;
  error?: string;
}

function getConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME ?? process.env.AIRTABLE_TABLE_ID;
  if (!apiKey || !baseId || !tableName) {
    return null;
  }
  return { apiKey, baseId, tableName };
}

const AIRTABLE_BATCH_SIZE = 10;

function orEmpty<T>(v: T | null | undefined): T | '' {
  if (v === null || v === undefined) return '';
  return v;
}

type AttemptRow = {
  id: string;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  mbti: string | null;
  axis_strengths: Record<string, number> | null;
  cognitive_percentile: number | null;
  neuroticism_score: number | null;
  report_text: string | null;
  user_id: string | null;
  client_token: string | null;
  airtable_record_id: string | null;
};

function buildFieldsBody(
  attempt: AttemptRow,
  user: { id?: string; email?: string; first_name?: string; device?: string } | null,
  responseByQuestion: Record<string, string>
): Record<string, unknown> {
  const axisStrengths = attempt.axis_strengths ?? {};
  const fields: Record<string, string | boolean> = {
    'Name': orEmpty(user?.first_name),
    'Email': orEmpty(user?.email),
    'Date': orEmpty(attempt.completed_at || attempt.started_at),
    'MBTI Result': orEmpty(attempt.mbti),
    'EI Strength': axisStrengths.EI != null ? String(axisStrengths.EI) : '',
    'TF Strength': axisStrengths.TF != null ? String(axisStrengths.TF) : '',
    'JP Strength': axisStrengths.JP != null ? String(axisStrengths.JP) : '',
    'IQ Result': '',
    'IQ Percentile': attempt.cognitive_percentile != null ? String(attempt.cognitive_percentile) : '',
    'Work Role': orEmpty(responseByQuestion.O1),
    'Ambition': orEmpty(responseByQuestion.O2),
    'Misunderstood': orEmpty(responseByQuestion.O3),
    'Insecurity': orEmpty(responseByQuestion.O4),
    'Accomplishment': orEmpty(responseByQuestion.O5),
    'AI Report': typeof attempt.report_text === 'string' ? attempt.report_text : '',
    'Archetype': '',
    'Archetype Blurb': '',
    'Slug': '',
    'Token': orEmpty(attempt.client_token),
    'User ID': user?.id != null ? String(user.id) : '',
    'Purchased': false,
    'Q1 PP': orEmpty(responseByQuestion.O1),
    'Q2 PP': orEmpty(responseByQuestion.O2),
    'Q3 PP': orEmpty(responseByQuestion.O3),
    'Q4 PP': orEmpty(responseByQuestion.O4),
    'Q5 PP': orEmpty(responseByQuestion.O5),
    'Q6 PP': orEmpty(responseByQuestion.O6),
    'Q7 PP': '',
    'Q8 PP': '',
    'Q9 PP': '',
    'Q10 PP': '',
    'Reason for purchasing': '',
    'Funnel #': '',
  };
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === '' || v === null || v === undefined || v === false) continue;
    body[k] = v;
  }
  return body;
}

export async function exportSubmissionToAirtable(assessmentId: string): Promise<ExportResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: 'Airtable not configured (AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME)' };
  }

  const supabase = createAdminClient();
  const { data: attempt, error: attemptError } = await supabase
    .from('assessment_attempts')
    .select('id, status, started_at, completed_at, mbti, axis_strengths, cognitive_percentile, neuroticism_score, report_text, user_id, client_token, airtable_record_id')
    .eq('id', assessmentId)
    .single();

  if (attemptError || !attempt) {
    return { ok: false, error: 'Submission not found' };
  }

  let user: { id?: string; email?: string; first_name?: string; device?: string } | null = null;
  if (attempt.user_id) {
    const { data: userRow } = await supabase
      .from('users')
      .select('id, email, first_name, device')
      .eq('id', attempt.user_id)
      .single();
    user = userRow;
  }

  const { data: responses } = await supabase
    .from('responses')
    .select('question_id, answer_raw')
    .eq('assessment_id', assessmentId);

  const responseByQuestion = Object.fromEntries(
    (responses ?? []).map((r: { question_id: string; answer_raw: string | null }) => [r.question_id, r.answer_raw ?? ''])
  );

  const body = buildFieldsBody(attempt as AttemptRow, user, responseByQuestion);
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };
  const existingRecordId = (attempt as AttemptRow).airtable_record_id?.trim() || null;

  if (existingRecordId) {
    const patchUrl = `${AIRTABLE_API}/${config.baseId}/${encodeURIComponent(config.tableName)}/${existingRecordId}`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields: body }),
    });
    if (patchRes.status === 404) {
      await supabase
        .from('assessment_attempts')
        .update({ airtable_record_id: null })
        .eq('id', assessmentId);
    } else if (!patchRes.ok) {
      const errText = await patchRes.text();
      return { ok: false, error: `Airtable update error ${patchRes.status}: ${errText.slice(0, 200)}` };
    } else {
      return { ok: true, airtableRecordId: existingRecordId };
    }
  }

  const url = `${AIRTABLE_API}/${config.baseId}/${encodeURIComponent(config.tableName)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields: body }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: `Airtable error ${res.status}: ${errText.slice(0, 200)}` };
  }

  const data = (await res.json()) as { id?: string };
  const newRecordId = data.id;
  if (newRecordId) {
    await supabase
      .from('assessment_attempts')
      .update({ airtable_record_id: newRecordId })
      .eq('id', assessmentId);
  }
  return { ok: true, airtableRecordId: newRecordId };
}

export interface BatchExportResult {
  results: ExportResult[];
}

export async function exportSubmissionsToAirtableBatch(assessmentIds: string[]): Promise<BatchExportResult> {
  const results: ExportResult[] = assessmentIds.map(() => ({ ok: false, error: 'Not processed' }));
  const config = getConfig();
  if (!config) {
    return {
      results: assessmentIds.map(() => ({ ok: false, error: 'Airtable not configured' })),
    };
  }

  const supabase = createAdminClient();
  const { data: attempts, error: attemptsError } = await supabase
    .from('assessment_attempts')
    .select('id, status, started_at, completed_at, mbti, axis_strengths, cognitive_percentile, neuroticism_score, report_text, user_id, client_token, airtable_record_id')
    .in('id', assessmentIds);

  if (attemptsError || !attempts?.length) {
    const msg = attemptsError?.message ?? 'No submissions found';
    return { results: assessmentIds.map(() => ({ ok: false, error: msg })) };
  }

  const attemptMap = new Map(attempts.map((a) => [a.id, a as AttemptRow]));
  const userIds = [...new Set((attempts as { user_id: string | null }[]).map((a) => a.user_id).filter(Boolean))] as string[];
  let userMap: Record<string, { id?: string; email?: string; first_name?: string; device?: string }> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, email, first_name, device')
      .in('id', userIds);
    userMap = Object.fromEntries(
      (users ?? []).map((u: { id: string; email?: string; first_name?: string; device?: string }) => [u.id, u])
    );
  }

  const { data: allResponses } = await supabase
    .from('responses')
    .select('assessment_id, question_id, answer_raw')
    .in('assessment_id', assessmentIds);

  const responseMap: Record<string, Record<string, string>> = {};
  for (const r of allResponses ?? []) {
    const a = r as { assessment_id: string; question_id: string; answer_raw: string | null };
    if (!responseMap[a.assessment_id]) responseMap[a.assessment_id] = {};
    responseMap[a.assessment_id][a.question_id] = a.answer_raw ?? '';
  }

  const toCreate: { assessmentId: string; fields: Record<string, unknown> }[] = [];
  const toUpdate: { assessmentId: string; airtableRecordId: string; fields: Record<string, unknown> }[] = [];

  for (const assessmentId of assessmentIds) {
    const attempt = attemptMap.get(assessmentId);
    if (!attempt) {
      results[assessmentIds.indexOf(assessmentId)] = { ok: false, error: 'Submission not found' };
      continue;
    }
    const user = attempt.user_id ? userMap[attempt.user_id] ?? null : null;
    const responseByQuestion = responseMap[assessmentId] ?? {};
    const fields = buildFieldsBody(attempt, user, responseByQuestion);
    const existingId = attempt.airtable_record_id?.trim() || null;
    if (existingId) {
      toUpdate.push({ assessmentId, airtableRecordId: existingId, fields });
    } else {
      toCreate.push({ assessmentId, fields });
    }
  }

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };
  const baseUrl = `${AIRTABLE_API}/${config.baseId}/${encodeURIComponent(config.tableName)}`;

  for (let i = 0; i < toCreate.length; i += AIRTABLE_BATCH_SIZE) {
    const chunk = toCreate.slice(i, i + AIRTABLE_BATCH_SIZE);
    const records = chunk.map((c) => ({ fields: c.fields }));
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ records }),
    });
    const raw = await res.text();
    let data: { records?: { id: string }[] } = {};
    try {
      if (raw) data = JSON.parse(raw) as { records?: { id: string }[] };
    } catch {
      //
    }
    if (!res.ok) {
      const err = `Airtable error ${res.status}: ${raw.slice(0, 150)}`;
      for (const c of chunk) {
        results[assessmentIds.indexOf(c.assessmentId)] = { ok: false, error: err };
      }
      continue;
    }
    const created = data.records ?? [];
    for (let j = 0; j < chunk.length; j++) {
      const rec = created[j];
      const { assessmentId } = chunk[j];
      const idx = assessmentIds.indexOf(assessmentId);
      if (rec?.id) {
        await supabase
          .from('assessment_attempts')
          .update({ airtable_record_id: rec.id })
          .eq('id', assessmentId);
        results[idx] = { ok: true, airtableRecordId: rec.id };
      } else {
        results[idx] = { ok: false, error: 'No record id in response' };
      }
    }
  }

  for (let i = 0; i < toUpdate.length; i += AIRTABLE_BATCH_SIZE) {
    const chunk = toUpdate.slice(i, i + AIRTABLE_BATCH_SIZE);
    const records = chunk.map((c) => ({ id: c.airtableRecordId, fields: c.fields }));
    const res = await fetch(baseUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ records }),
    });
    if (!res.ok) {
      const errText = await res.text();
      const isRowMissing =
        res.status === 422 &&
        (errText.includes('ROW_DOES_NOT_EXIST') || errText.includes('does not exist'));
      if (isRowMissing) {
        for (const c of chunk) {
          await supabase
            .from('assessment_attempts')
            .update({ airtable_record_id: null })
            .eq('id', c.assessmentId);
        }
        const createRecords = chunk.map((c) => ({ fields: c.fields }));
        const postRes = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ records: createRecords }),
        });
        const postRaw = await postRes.text();
        let postData: { records?: { id: string }[] } = {};
        try {
          if (postRaw) postData = JSON.parse(postRaw) as { records?: { id: string }[] };
        } catch {
          //
        }
        if (!postRes.ok) {
          for (const c of chunk) {
            results[assessmentIds.indexOf(c.assessmentId)] = {
              ok: false,
              error: `Re-create failed: ${postRaw.slice(0, 100)}`,
            };
          }
        } else {
          const created = postData.records ?? [];
          for (let j = 0; j < chunk.length; j++) {
            const rec = created[j];
            const { assessmentId } = chunk[j];
            const idx = assessmentIds.indexOf(assessmentId);
            if (rec?.id) {
              await supabase
                .from('assessment_attempts')
                .update({ airtable_record_id: rec.id })
                .eq('id', assessmentId);
              results[idx] = { ok: true, airtableRecordId: rec.id };
            } else {
              results[idx] = { ok: false, error: 'No record id in response' };
            }
          }
        }
      } else {
        const err = `Airtable update error ${res.status}: ${errText.slice(0, 150)}`;
        for (const c of chunk) {
          results[assessmentIds.indexOf(c.assessmentId)] = { ok: false, error: err };
        }
      }
      continue;
    }
    for (const c of chunk) {
      results[assessmentIds.indexOf(c.assessmentId)] = { ok: true, airtableRecordId: c.airtableRecordId };
    }
  }

  const notProcessed = assessmentIds.map((id, idx) => (results[idx].error === 'Not processed' ? { id, idx } : null)).filter(Boolean);
  for (const x of notProcessed as { id: string; idx: number }[]) {
    results[x.idx] = { ok: false, error: 'Submission not found' };
  }

  return { results };
}

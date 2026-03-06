import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseQuestionnaire } from '../_shared/questionnaire.ts';
import {
  buildAssessmentDataBlock,
  buildUserMessage,
  SYSTEM_PROMPT,
  type AssessmentData,
} from './prompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-3-haiku-20240307';
const MAX_TOKENS = 1024;
async function sendReportToCustomer(opts: {
  to: string;
  firstName: string;
  reportText: string;
  resultsUrl: string;
  attachPdf?: boolean;
}): Promise<void> {
  const siteUrl = Deno.env.get('SITE_URL');
  const emailApiSecret = Deno.env.get('EMAIL_API_SECRET');
  if (!siteUrl || !emailApiSecret) {
    console.log('[report-email] Skipped: SITE_URL or EMAIL_API_SECRET not configured');
    return;
  }
  const endpoint = `${siteUrl.replace(/\/$/, '')}/api/send-report-email`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emailApiSecret}`,
      },
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[report-email] Failed:', res.status, err);
    }
  } catch (e) {
    console.error('[report-email] Error:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const assessmentId = body?.assessmentId ?? body?.assessment_id;
    const clientToken = body?.clientToken ?? body?.client_token;
    if (!assessmentId || typeof assessmentId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'assessmentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!clientToken || typeof clientToken !== 'string') {
      return new Response(
        JSON.stringify({ error: 'clientToken is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set');
      return new Response(
        JSON.stringify({ reportText: null, error: 'Report generation not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: assessmentRow, error: assessmentError } = await supabase
      .from('assessment_attempts')
      .select('id, user_id, client_token, status, mbti, axis_strengths, cognitive_percentile, report_text, questionnaire_version_id, paid_responses')
      .eq('id', assessmentId)
      .eq('client_token', clientToken)
      .single();

    if (assessmentError || !assessmentRow) {
      return new Response(
        JSON.stringify({ error: 'Assessment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (assessmentRow.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Assessment must be completed before generating report' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (assessmentRow.report_text && typeof assessmentRow.report_text === 'string' && assessmentRow.report_text.trim()) {
      return new Response(
        JSON.stringify({ reportText: assessmentRow.report_text }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: responses } = await supabase
      .from('responses')
      .select('question_id, answer_raw')
      .eq('assessment_id', assessmentId)
      .not('answer_raw', 'is', null);

    const questionIds = [...new Set((responses ?? []).map((r: { question_id: string }) => r.question_id))];
    let questionMap = new Map<string, string>();

    let questionnaireData: { questionnaire?: unknown } | null = null;
    if (assessmentRow.questionnaire_version_id) {
      const { data: qv } = await supabase
        .from('assessments')
        .select('questionnaire')
        .eq('id', assessmentRow.questionnaire_version_id)
        .single();
      questionnaireData = qv;
      if (qv?.questionnaire) {
        const parsed = parseQuestionnaire(qv.questionnaire, 'free');
        questionMap = new Map(parsed.questions.map((q) => [q.id, q.text]));
      }
    }

    const { data: userRow } = assessmentRow.user_id
      ? await supabase.from('users').select('first_name, email').eq('id', assessmentRow.user_id).single()
      : { data: null };
    const shortAnswers: Array<{ questionText: string; answerRaw: string }> = [];
    for (const r of responses ?? []) {
      const text = questionMap.get(r.question_id);
      if (text && r.answer_raw) shortAnswers.push({ questionText: text, answerRaw: r.answer_raw });
    }

    const paidResponses = (assessmentRow.paid_responses ?? {}) as Record<string, { answerRaw?: string }>;
    if (Object.keys(paidResponses).length > 0 && questionnaireData?.questionnaire) {
      const parsed = parseQuestionnaire(questionnaireData.questionnaire, 'paid');
      const paidQuestionMap = new Map(parsed.questions.map((q) => [q.id, q.text]));
      for (const [qId, val] of Object.entries(paidResponses)) {
        const raw = val?.answerRaw;
        if (typeof raw === 'string' && raw.trim()) {
          const text = paidQuestionMap.get(qId) || qId;
          shortAnswers.push({ questionText: text, answerRaw: raw.trim() });
        }
      }
    }

    const axisStrengths = (assessmentRow.axis_strengths as Record<string, number>) ?? {};
    const data: AssessmentData = {
      firstName: (userRow?.first_name ?? '').trim() || 'There',
      mbti: assessmentRow.mbti ?? '----',
      axisStrengths,
      cognitivePercentile: assessmentRow.cognitive_percentile ?? null,
      shortAnswers,
    };

    const assessmentDataBlock = buildAssessmentDataBlock(data);
    const userMessage = buildUserMessage(assessmentDataBlock);

    let systemPrompt = SYSTEM_PROMPT;
    const { data: promptRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'report_system_prompt')
      .single();
    if (promptRow?.value != null && typeof promptRow.value === 'string' && promptRow.value.trim()) {
      systemPrompt = promptRow.value.trim();
    }

    let model = DEFAULT_MODEL;
    const { data: modelRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'report_model')
      .single();
    if (modelRow?.value != null && typeof modelRow.value === 'string' && modelRow.value.trim()) {
      model = modelRow.value.trim();
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error', anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate report' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicJson = await anthropicRes.json();
    const content = anthropicJson.content;
    if (!Array.isArray(content) || content.length === 0) {
      console.error('Anthropic unexpected response', anthropicJson);
      return new Response(
        JSON.stringify({ error: 'Failed to generate report' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const textBlock = content.find((b: { type: string }) => b.type === 'text');
    const reportText = textBlock?.text ?? '';

    const { error: updateError } = await supabase
      .from('assessment_attempts')
      .update({ report_text: reportText, report_model: model })
      .eq('id', assessmentId);

    if (updateError) {
      console.error('assessments report_text update error', updateError);
    }

    const firstName = (userRow?.first_name ?? '').trim() || 'There';
    const customerEmail = typeof userRow?.email === 'string' ? userRow.email.trim() : null;
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.talentrank.io';
    const base = siteUrl.replace(/\/$/, '');
    const resultsUrl = `${base}/assessment/result?assessmentId=${encodeURIComponent(assessmentId)}&clientToken=${encodeURIComponent(clientToken)}`;
    if (customerEmail) {
      await sendReportToCustomer({
        to: customerEmail,
        firstName,
        reportText,
        resultsUrl,
        attachPdf: true,
      });
    }

    return new Response(
      JSON.stringify({ reportText }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('generate-report error', e);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

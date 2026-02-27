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
const RESULTS_BASE_URL = 'https://app.talentrank.io/results?recordId=';

function mockSendReportToCustomer(opts: { to: string; firstName: string; reportText: string; resultsUrl: string }) {
  console.log('[MOCK] Would send report email to customer:', {
    to: opts.to,
    subject: `Your TalentRank Assessment Report`,
    bodyPreview: `Hi ${opts.firstName}, your personalized report is ready. View results: ${opts.resultsUrl}`,
    resultsUrl: opts.resultsUrl,
  });
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
      .select('id, user_id, client_token, status, mbti, axis_strengths, cognitive_percentile, report_text, questionnaire_version_id')
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

    if (assessmentRow.questionnaire_version_id) {
      const { data: qv } = await supabase
        .from('assessments')
        .select('questionnaire')
        .eq('id', assessmentRow.questionnaire_version_id)
        .single();
      if (qv?.questionnaire) {
        const parsed = parseQuestionnaire(qv.questionnaire);
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
    const resultsUrl = `${RESULTS_BASE_URL}${assessmentId}`;
    if (customerEmail) {
      mockSendReportToCustomer({
        to: customerEmail,
        firstName,
        reportText,
        resultsUrl,
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

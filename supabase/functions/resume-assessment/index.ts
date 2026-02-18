import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseQuestionnaire } from '../_shared/questionnaire.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: assessmentRow, error: assessmentError } = await supabase
      .from('assessment_attempts')
      .select('id, client_token, status, questionnaire_version_id')
      .eq('id', assessmentId)
      .eq('client_token', clientToken)
      .single();

    if (assessmentError || !assessmentRow) {
      return new Response(
        JSON.stringify({ error: 'Assessment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sections: Array<Record<string, unknown>> = [];
    let questions: Array<Record<string, unknown>> = [];

    if (assessmentRow.questionnaire_version_id) {
      const { data: qv } = await supabase
        .from('assessments')
        .select('questionnaire')
        .eq('id', assessmentRow.questionnaire_version_id)
        .single();
      if (qv?.questionnaire) {
        const parsed = parseQuestionnaire(qv.questionnaire);
        sections = parsed.sections as Array<Record<string, unknown>>;
        questions = (parsed.questions as Array<Record<string, unknown>>).filter((q) => q.active !== false) as Array<Record<string, unknown>>;
      }
    }

    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('question_id, answer_numeric, answer_raw')
      .eq('assessment_id', assessmentId);

    if (responsesError) {
      console.error('responses fetch error', responsesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch responses' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responsesOut = (responses ?? []).map((r: { question_id: string; answer_numeric: number | null; answer_raw: string | null }) => ({
      questionId: r.question_id,
      answerNumeric: r.answer_numeric,
      answerRaw: r.answer_raw,
    }));

    return new Response(
      JSON.stringify({
        assessmentId: assessmentRow.id,
        clientToken: assessmentRow.client_token,
        status: assessmentRow.status,
        sections,
        questions,
        responses: responsesOut,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('resume-assessment error', e);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

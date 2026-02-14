import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseQuestionnaire } from '../_shared/questionnaire.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const QUESTIONNAIRE_VERSION = 'v1.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({})
      .select('id')
      .single();

    if (userError || !userData?.id) {
      console.error('users insert error', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientToken = crypto.randomUUID();

    const { data: versionRow } = await supabase
      .from('assessments')
      .select('id')
      .eq('version', QUESTIONNAIRE_VERSION)
      .single();

    const questionnaireVersionId = versionRow?.id ?? null;

    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessment_attempts')
      .insert({
        user_id: userData.id,
        version: QUESTIONNAIRE_VERSION,
        status: 'started',
        started_at: new Date().toISOString(),
        client_token: clientToken,
        questionnaire_version_id: questionnaireVersionId,
      })
      .select('id, client_token')
      .single();

    if (assessmentError || !assessmentData?.id) {
      console.error('assessments insert error', assessmentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create assessment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sections: Array<Record<string, unknown>> = [];
    let questions: Array<Record<string, unknown>> = [];

    if (versionRow?.id) {
      const { data: qv } = await supabase
        .from('assessments')
        .select('questionnaire')
        .eq('id', versionRow.id)
        .single();
      if (qv?.questionnaire) {
        const parsed = parseQuestionnaire(qv.questionnaire);
        sections = parsed.sections as Array<Record<string, unknown>>;
        questions = (parsed.questions as Array<Record<string, unknown>>).filter((q) => q.active !== false) as Array<Record<string, unknown>>;
      }
    }

    return new Response(
      JSON.stringify({
        assessmentId: assessmentData.id,
        clientToken: assessmentData.client_token,
        sections,
        questions,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('start-assessment error', e);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

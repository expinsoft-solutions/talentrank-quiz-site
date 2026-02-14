import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const { data: row, error } = await supabase
      .from('assessment_attempts')
      .select(`
        id,
        status,
        mbti,
        axis_strengths,
        cognitive_percentile,
        neuroticism_score,
        self_sabotage_scores,
        optimal_env_scores,
        report_text,
        user_id
      `)
      .eq('id', assessmentId)
      .eq('client_token', clientToken)
      .single();

    if (error || !row) {
      return new Response(
        JSON.stringify({ error: 'Assessment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (row.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Assessment is not completed yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let firstName: string | null = null;
    if (row.user_id) {
      const { data: userRow } = await supabase
        .from('users')
        .select('first_name')
        .eq('id', row.user_id)
        .single();
      firstName = userRow?.first_name ?? null;
    }

    const axisStrengths = (row.axis_strengths as Record<string, number>) ?? {};
    return new Response(
      JSON.stringify({
        assessmentId: row.id,
        mbti: row.mbti ?? '—',
        axisStrengths,
        iqPercentile: typeof row.cognitive_percentile === 'number' ? row.cognitive_percentile : 0,
        neuroticismScore: row.neuroticism_score ?? undefined,
        selfSabotageScores: (row.self_sabotage_scores as Record<string, number>) ?? undefined,
        optimalEnvScores: (row.optimal_env_scores as Record<string, number>) ?? undefined,
        reportText: typeof row.report_text === 'string' ? row.report_text : null,
        firstName: firstName ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('get-assessment-result error', e);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

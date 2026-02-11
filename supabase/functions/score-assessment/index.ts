import { createClient } from 'npm:@supabase/supabase-js@2';
import { scoreAssessment } from './scoring.ts';

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
      .from('assessments')
      .select('id, client_token')
      .eq('id', assessmentId)
      .eq('client_token', clientToken)
      .single();

    if (assessmentError || !assessmentRow) {
      return new Response(
        JSON.stringify({ error: 'Assessment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [{ data: responses }, { data: questions }] = await Promise.all([
      supabase
        .from('responses')
        .select('question_id, answer_numeric, time_taken_seconds')
        .eq('assessment_id', assessmentId),
      supabase
        .from('questions')
        .select('id, section_id, type, dimension, reverse_scored, weight, correct_answer'),
    ]);

    const totalTimeSeconds =
      (responses ?? []).reduce((sum, r) => sum + (r.time_taken_seconds ?? 0), 0);
    const completedAt = new Date().toISOString();

    const result = scoreAssessment(responses ?? [], questions ?? [], {
      personalityScalePoints: 5,
    });

    const { error: updateError } = await supabase
      .from('assessments')
      .update({
        status: 'completed',
        completed_at: completedAt,
        total_time_seconds: totalTimeSeconds,
        mbti: result.mbti,
        axis_strengths: result.axisStrengths,
        cognitive_percentile: result.iqPercentile,
        ...(result.neuroticismScore != null && { neuroticism_score: result.neuroticismScore }),
        ...(result.selfSabotageScores && { self_sabotage_scores: result.selfSabotageScores }),
        ...(result.optimalEnvScores && { optimal_env_scores: result.optimalEnvScores }),
      })
      .eq('id', assessmentId);

    if (updateError) {
      console.error('assessments update error', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to complete assessment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        mbti: result.mbti,
        axisStrengths: result.axisStrengths,
        iqPercentile: result.iqPercentile,
        ...(result.neuroticismScore != null && { neuroticismScore: result.neuroticismScore }),
        ...(result.selfSabotageScores && { selfSabotageScores: result.selfSabotageScores }),
        ...(result.optimalEnvScores && { optimalEnvScores: result.optimalEnvScores }),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('score-assessment error', e);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

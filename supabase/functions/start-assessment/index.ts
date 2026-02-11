import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSESSMENT_VERSION = 'v1.0';

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

    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        user_id: userData.id,
        version: ASSESSMENT_VERSION,
        status: 'started',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (assessmentError || !assessmentData?.id) {
      console.error('assessments insert error', assessmentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create assessment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [sectionsRes, questionsRes] = await Promise.all([
      supabase.from('sections').select('*').order('order_index'),
      supabase
        .from('questions')
        .select('id, section_id, text, type, dimension, reverse_scored, weight, correct_answer, active')
        .eq('active', true)
        .order('section_id')
        .order('id'),
    ]);

    if (sectionsRes.error) {
      console.error('sections fetch error', sectionsRes.error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch sections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (questionsRes.error) {
      console.error('questions fetch error', questionsRes.error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        assessmentId: assessmentData.id,
        sections: sectionsRes.data ?? [],
        questions: questionsRes.data ?? [],
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

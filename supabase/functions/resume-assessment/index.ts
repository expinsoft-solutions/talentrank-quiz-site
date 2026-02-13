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

    const { data: assessmentRow, error: assessmentError } = await supabase
      .from('assessments')
      .select('id, client_token, status')
      .eq('id', assessmentId)
      .eq('client_token', clientToken)
      .single();

    if (assessmentError || !assessmentRow) {
      return new Response(
        JSON.stringify({ error: 'Assessment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [sectionsRes, questionsRes, responsesRes] = await Promise.all([
      supabase.from('sections').select('*').order('order_index'),
      supabase
        .from('questions')
        .select('id, section_id, text, type, dimension, reverse_scored, weight, correct_answer, active')
        .eq('active', true)
        .order('section_id')
        .order('id'),
      supabase
        .from('responses')
        .select('question_id, answer_numeric, answer_raw')
        .eq('assessment_id', assessmentId),
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
    if (responsesRes.error) {
      console.error('responses fetch error', responsesRes.error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch responses' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        assessmentId: assessmentRow.id,
        clientToken: assessmentRow.client_token,
        status: assessmentRow.status,
        sections: sectionsRes.data ?? [],
        questions: questionsRes.data ?? [],
        responses: responsesRes.data ?? [],
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

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
    const email = body?.email;
    const firstName = body?.firstName ?? body?.first_name;
    const device = body?.device;

    if (!assessmentId || typeof assessmentId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'assessmentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return new Response(
        JSON.stringify({ error: 'email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: assessmentData, error: fetchError } = await supabase
      .from('assessment_attempts')
      .select('user_id, version')
      .eq('id', assessmentId)
      .single();

    if (fetchError || !assessmentData?.user_id) {
      return new Response(
        JSON.stringify({ error: 'Assessment not found or has no user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const first_name = typeof firstName === 'string' ? firstName.trim() || null : null;
    const deviceVal = typeof device === 'string' ? device : null;

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    const userId = existingUser?.id ?? assessmentData.user_id;

    if (existingUser?.id && existingUser.id !== assessmentData.user_id) {
      const { error: updateAttemptError } = await supabase
        .from('assessment_attempts')
        .update({ user_id: existingUser.id })
        .eq('id', assessmentId);

      if (updateAttemptError) {
        console.error('assessment_attempts update error', updateAttemptError);
        return new Response(
          JSON.stringify({ error: 'Failed to save user details' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const quizKey = typeof assessmentData?.version === 'string' ? assessmentData.version : 'unknown';
    const { data: existingRow } = await supabase
      .from('user_quiz_attempt_counts')
      .select('attempt_count')
      .eq('user_id', userId)
      .eq('quiz_key', quizKey)
      .single();

    const nextCount = (existingRow?.attempt_count ?? 0) + 1;
    const { error: countError } = await supabase
      .from('user_quiz_attempt_counts')
      .upsert(
        { user_id: userId, quiz_key: quizKey, attempt_count: nextCount, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,quiz_key' }
      );

    if (countError) {
      console.error('user_quiz_attempt_counts upsert error', countError);
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        email: normalizedEmail,
        first_name: first_name,
        device: deviceVal,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('users update error', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save user details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('update-assessment-user error', e);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

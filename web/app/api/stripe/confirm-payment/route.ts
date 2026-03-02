import { NextResponse } from 'next/server';
import { StripeSettingsService } from '@/lib/stripe/StripeSettingsService';
import { StripeService } from '@/lib/stripe/StripeService';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  let body: { sessionId?: string; assessmentId?: string; clientToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId, assessmentId, clientToken } = body;

  if (sessionId && typeof sessionId === 'string') {
    let settings;
    try {
      const service = new StripeSettingsService();
      settings = await service.getSettings();
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }

    if (!settings.secretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    try {
      const stripe = new StripeService(settings.secretKey);
      const session = await stripe.retrieveSession(sessionId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
      }
      const metaAssessmentId = session.metadata?.assessmentId;
      if (!metaAssessmentId || typeof metaAssessmentId !== 'string') {
        return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 });
      }

      const admin = createAdminClient();
      const { error } = await admin
        .from('assessment_attempts')
        .update({
          is_paid: true,
          stripe_checkout_session_id: session.id,
        })
        .eq('id', metaAssessmentId);

      if (error) {
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, assessmentId: metaAssessmentId });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 400 });
    }
  }

  if (assessmentId && clientToken && typeof assessmentId === 'string' && typeof clientToken === 'string') {
    const admin = createAdminClient();
    const { data: attempt } = await admin
      .from('assessment_attempts')
      .select('id, stripe_checkout_session_id')
      .eq('id', assessmentId)
      .eq('client_token', clientToken)
      .single();

    if (!attempt) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    if (attempt.stripe_checkout_session_id) {
      let settings;
      try {
        const service = new StripeSettingsService();
        settings = await service.getSettings();
      } catch {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
      }
      if (!settings.secretKey) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
      }
      try {
        const stripe = new StripeService(settings.secretKey);
        const session = await stripe.retrieveSession(attempt.stripe_checkout_session_id);
        if (session.payment_status === 'paid') {
          await admin
            .from('assessment_attempts')
            .update({ is_paid: true })
            .eq('id', assessmentId)
            .eq('client_token', clientToken);
          return NextResponse.json({ ok: true });
        }
      } catch {
        //
      }
    }
    return NextResponse.json({ error: 'Payment not found or not completed' }, { status: 400 });
  }

  return NextResponse.json({ error: 'sessionId or (assessmentId and clientToken) required' }, { status: 400 });
}

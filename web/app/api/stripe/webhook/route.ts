import { NextResponse } from 'next/server';
import { StripeSettingsService } from '@/lib/stripe/StripeSettingsService';
import { StripeService } from '@/lib/stripe/StripeService';
import { createAdminClient } from '@/lib/supabase/admin';

// Disable body parsing so we can verify the raw Stripe signature
export const config = { api: { bodyParser: false } };

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let rawBody: Buffer;
  try {
    const arrayBuffer = await request.arrayBuffer();
    rawBody = Buffer.from(arrayBuffer);
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  let settings;
  try {
    const settingsService = new StripeSettingsService();
    settings = await settingsService.getSettings();
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  if (!settings.webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }
  if (!settings.secretKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  let event;
  try {
    const stripe = new StripeService(settings.secretKey);
    event = stripe.constructWebhookEvent(rawBody, signature, settings.webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${String(err)}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const assessmentId = session.metadata?.assessmentId;

    if (assessmentId) {
      const admin = createAdminClient();
      await admin
        .from('assessment_attempts')
        .update({
          is_paid: true,
          stripe_checkout_session_id: session.id,
        })
        .eq('id', assessmentId);
    }
  }

  return NextResponse.json({ received: true });
}

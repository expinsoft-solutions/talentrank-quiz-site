import { NextResponse } from 'next/server';
import { StripeSettingsService } from '@/lib/stripe/StripeSettingsService';
import { StripeService } from '@/lib/stripe/StripeService';

export async function POST(request: Request) {
  let body: { assessmentId?: string; clientToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { assessmentId, clientToken } = body;
  if (!assessmentId || !clientToken) {
    return NextResponse.json({ error: 'assessmentId and clientToken are required' }, { status: 400 });
  }

  let settings;
  try {
    const service = new StripeSettingsService();
    settings = await service.getSettings();
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  if (!settings.enabled) {
    return NextResponse.json({ error: 'Stripe payments are not enabled' }, { status: 400 });
  }
  if (!settings.secretKey) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }
  if (!settings.priceId) {
    return NextResponse.json({ error: 'No Stripe price configured' }, { status: 500 });
  }

  const origin = request.headers.get('origin') ?? '';

  try {
    const stripe = new StripeService(settings.secretKey);
    const session = await stripe.createCheckoutSession({
      priceId: settings.priceId,
      successUrl: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&assessmentId=${encodeURIComponent(assessmentId)}&clientToken=${encodeURIComponent(clientToken)}`,
      cancelUrl: `${origin}/assessment/result?assessmentId=${encodeURIComponent(assessmentId)}&clientToken=${encodeURIComponent(clientToken)}`,
      metadata: { assessmentId, clientToken },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

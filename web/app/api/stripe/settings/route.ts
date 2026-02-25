import { NextResponse } from 'next/server';
import { StripeSettingsService } from '@/lib/stripe/StripeSettingsService';

/** Public endpoint — returns Stripe display config (no secret keys) */
export async function GET() {
  try {
    const service = new StripeSettingsService();
    const settings = await service.getPublicSettings();
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

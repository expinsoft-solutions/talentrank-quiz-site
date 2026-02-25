import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { StripeSettingsService } from '@/lib/stripe/StripeSettingsService';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, status: 401 };
  }

  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (!userRow || userRow.role !== 'admin') {
    return { ok: false as const, status: 403 };
  }

  return { ok: true as const };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  try {
    const service = new StripeSettingsService();
    const settings = await service.getSettings();

    return NextResponse.json({
      enabled: settings.enabled,
      // Mask sensitive keys — only expose whether they are set
      hasSecretKey: settings.secretKey !== '',
      secretKey: settings.secretKey !== '' ? '••••••••' : '',
      publishableKey: settings.publishableKey,
      hasWebhookSecret: settings.webhookSecret !== '',
      webhookSecret: settings.webhookSecret !== '' ? '••••••••' : '',
      priceId: settings.priceId,
      productName: settings.productName,
      productDescription: settings.productDescription,
      priceDisplay: settings.priceDisplay,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  let body: {
    enabled?: boolean;
    secretKey?: string;
    publishableKey?: string;
    webhookSecret?: string;
    priceId?: string;
    productName?: string;
    productDescription?: string;
    priceDisplay?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const service = new StripeSettingsService();
    await service.updateSettings({
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      // Only write secret keys if the value is a real key (not the masked placeholder)
      secretKey: typeof body.secretKey === 'string' && body.secretKey !== '••••••••' ? body.secretKey.trim() : undefined,
      publishableKey: typeof body.publishableKey === 'string' ? body.publishableKey.trim() : undefined,
      webhookSecret: typeof body.webhookSecret === 'string' && body.webhookSecret !== '••••••••' ? body.webhookSecret.trim() : undefined,
      priceId: typeof body.priceId === 'string' ? body.priceId.trim() : undefined,
      productName: typeof body.productName === 'string' ? body.productName.trim() : undefined,
      productDescription: typeof body.productDescription === 'string' ? body.productDescription.trim() : undefined,
      priceDisplay: typeof body.priceDisplay === 'string' ? body.priceDisplay.trim() : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

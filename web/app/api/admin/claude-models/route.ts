import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

const FALLBACK_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-haiku-20240620',
  'claude-2.1',
  'claude-2.0',
];

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'anthropic-version': '2023-06-01',
          'x-api-key': apiKey,
        },
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: Array<{ id: string; display_name?: string }> };
        const models = json.data ?? [];
        const items = models
          .filter((m) => m.id)
          .map((m) => ({
            id: m.id,
            displayName: m.display_name ?? m.id,
          }));
        if (items.length > 0) {
          return NextResponse.json({ models: items });
        }
      }
    } catch {
      //
    }
  }

  const items = FALLBACK_MODELS.map((id) => ({ id, displayName: id }));
  return NextResponse.json({ models: items });
}

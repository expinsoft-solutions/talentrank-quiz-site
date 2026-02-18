import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (!userRow || userRow.role !== 'admin') {
    return NextResponse.json({ isAdmin: false, user: { id: user.id, email: user.email } }, { status: 403 });
  }

  return NextResponse.json({
    isAdmin: true,
    user: { id: user.id, email: user.email },
  });
}

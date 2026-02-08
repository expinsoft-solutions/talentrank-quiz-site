import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;
    if (!assessmentId) {
      return NextResponse.json(
        { error: 'assessmentId is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, firstName, device } = body as {
      email?: string;
      firstName?: string;
      device?: string;
    };

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: assessmentData, error: fetchError } = await supabase
      .from('assessments')
      .select('user_id')
      .eq('id', assessmentId)
      .single();

    if (fetchError || !assessmentData?.user_id) {
      console.error('assessment fetch error', fetchError);
      return NextResponse.json(
        { error: 'Assessment not found or has no user' },
        { status: 404 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const first_name = typeof firstName === 'string' ? firstName.trim() : null;
    const deviceVal = typeof device === 'string' ? device : null;

    const { error: updateError } = await supabase
      .from('users')
      .update({
        email: normalizedEmail,
        first_name: first_name ?? null,
        device: deviceVal ?? null,
      })
      .eq('id', assessmentData.user_id);

    if (updateError) {
      console.error('users update error', updateError);
      return NextResponse.json(
        { error: 'Failed to save user details' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('saveUser error', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

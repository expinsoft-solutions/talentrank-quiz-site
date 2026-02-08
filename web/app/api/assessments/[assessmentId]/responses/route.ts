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
    const {
      questionId,
      answerRaw,
      answerNumeric,
      timeTakenSeconds,
    } = body as {
      questionId?: string;
      answerRaw?: string;
      answerNumeric?: number;
      timeTakenSeconds?: number;
    };

    if (!questionId || typeof questionId !== 'string' || !questionId.trim()) {
      return NextResponse.json(
        { error: 'questionId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from('responses').insert({
      assessment_id: assessmentId,
      question_id: questionId.trim(),
      answer_raw: typeof answerRaw === 'string' ? answerRaw : null,
      answer_numeric:
        typeof answerNumeric === 'number' && !Number.isNaN(answerNumeric)
          ? answerNumeric
          : null,
      time_taken_seconds:
        typeof timeTakenSeconds === 'number' &&
        !Number.isNaN(timeTakenSeconds) &&
        timeTakenSeconds >= 0
          ? timeTakenSeconds
          : null,
    });

    if (error) {
      console.error('responses insert error', error);
      return NextResponse.json(
        { error: 'Failed to save response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('submitResponse error', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

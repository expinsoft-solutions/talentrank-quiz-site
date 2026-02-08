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

    const supabase = createSupabaseServerClient();
    const completedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('assessments')
      .update({
        status: 'completed',
        completed_at: completedAt,
      })
      .eq('id', assessmentId);

    if (updateError) {
      console.error('assessments update error', updateError);
      return NextResponse.json(
        { error: 'Failed to complete assessment' },
        { status: 500 }
      );
    }

    const { data: responses } = await supabase
      .from('responses')
      .select('question_id, answer_numeric, time_taken_seconds')
      .eq('assessment_id', assessmentId);

    const totalTimeSeconds =
      responses?.reduce((sum, r) => sum + (r.time_taken_seconds ?? 0), 0) ?? 0;
    await supabase
      .from('assessments')
      .update({ total_time_seconds: totalTimeSeconds })
      .eq('id', assessmentId);

    return NextResponse.json({
      mbti: 'INTJ',
      axisStrengths: {
        EI: 72,
        NS: 61,
        TF: 44,
        JP: 79,
      },
      iqPercentile: 87,
    });
  } catch (e) {
    console.error('completeAssessment error', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

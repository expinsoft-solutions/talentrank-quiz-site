import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const ASSESSMENT_VERSION = 'v1.0';

export async function POST() {
  try {
    const supabase = createSupabaseServerClient();

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({})
      .select('id')
      .single();

    if (userError || !userData?.id) {
      console.error('users insert error', userError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        user_id: userData.id,
        version: ASSESSMENT_VERSION,
        status: 'started',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (assessmentError || !assessmentData?.id) {
      console.error('assessments insert error', assessmentError);
      return NextResponse.json(
        { error: 'Failed to create assessment' },
        { status: 500 }
      );
    }

    const [sectionsRes, questionsRes] = await Promise.all([
      supabase.from('sections').select('*').order('order_index'),
      supabase
        .from('questions')
        .select('id, section_id, text, type, dimension, reverse_scored, weight, correct_answer, active')
        .eq('active', true)
        .order('section_id')
        .order('id'),
    ]);

    if (sectionsRes.error) {
      console.error('sections fetch error', sectionsRes.error);
      return NextResponse.json(
        { error: 'Failed to fetch sections' },
        { status: 500 }
      );
    }
    if (questionsRes.error) {
      console.error('questions fetch error', questionsRes.error);
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      assessmentId: assessmentData.id,
      sections: sectionsRes.data ?? [],
      questions: questionsRes.data ?? [],
    });
  } catch (e) {
    console.error('startAssessment error', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

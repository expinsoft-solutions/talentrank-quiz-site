'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { getResumeCookie, setResumeCookie, clearResumeCookie } from '@/lib/resume-cookie';
import { getOrderedSectionSteps, getFallbackSectionSteps } from '@/lib/assessment';
import { supabase } from '@/lib/supabase';
import type { StartAssessmentResponse } from '@/types';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    setHasResume(getResumeCookie() !== null);
  }, []);

  async function handleStart(clearExisting = false) {
    if (clearExisting) {
      clearResumeCookie();
    }
    setError(null);
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('start-assessment', {
        body: {},
      });
      if (fnError) {
        setError(fnError.message ?? 'Failed to start assessment');
        setLoading(false);
        return;
      }
      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      const res = data as StartAssessmentResponse;
      const sectionSteps = getOrderedSectionSteps(res.sections, res.questions, {
        excludeCognitive: true,
      });
      const steps = sectionSteps.length > 0 ? sectionSteps : getFallbackSectionSteps();
      if (steps.length > 0) {
        setResumeCookie({
          assessmentId: res.assessmentId,
          clientToken: res.clientToken,
          phase: 'section',
          sectionIndex: 0,
          questionIndex: 0,
        });
      }
      router.push('/assessment');
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-full max-w-xl space-y-8">
        <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
          TalentRank
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Discover how you’re wired and where you shine. Take the assessment to get your personality
          type, axis strengths, and a personalized report.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col items-center gap-3">
          <Button
            type="button"
            onClick={hasResume ? () => router.push('/assessment') : () => handleStart()}
            disabled={loading}
            size="lg"
            className="min-w-[200px] h-12 text-base font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-70"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader size="sm" className="border-t-white" />
                Starting…
              </span>
            ) : hasResume ? (
              'Resume Quiz'
            ) : (
              'Start assessment'
            )}
          </Button>
          {hasResume && !loading && (
            <button
              type="button"
              onClick={() => handleStart(true)}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              or start again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

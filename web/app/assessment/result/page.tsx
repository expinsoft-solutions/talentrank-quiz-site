'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ResultView } from '@/components/quiz';
import { Loader } from '@/components/ui/loader';
import { supabase } from '@/lib/supabase';
import type { CompleteResult } from '@/components/quiz/ResultView';

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader className="border-indigo-500" /></div>}>
      <ResultPageContent />
    </Suspense>
  );
}

function ResultPageContent() {
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId');
  const clientToken = searchParams.get('clientToken');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    completeResult: CompleteResult;
    reportText: string | null;
    firstName: string | null;
  } | null>(null);

  useEffect(() => {
    if (!assessmentId || !clientToken) {
      setError('Missing assessment or token');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-assessment-result', {
          body: { assessmentId, clientToken },
        });
        if (fnError) {
          setError(fnError.message ?? 'Failed to load results');
          setLoading(false);
          return;
        }
        if (data?.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        const mbti = data?.mbti ?? '—';
        const axisStrengths = (data?.axisStrengths as Record<string, number>) ?? {};
        const iqPercentile = typeof data?.iqPercentile === 'number' ? data.iqPercentile : 0;
        const selfSabotageScores = data?.selfSabotageScores as Record<string, number> | undefined;
        const optimalEnvScores = data?.optimalEnvScores as Record<string, number> | undefined;
        const reportText = typeof data?.reportText === 'string' ? data.reportText : null;
        const firstName = typeof data?.firstName === 'string' ? data.firstName : null;

        setResult({
          completeResult: {
            mbti,
            axisStrengths,
            iqPercentile,
            selfSabotageScores,
            optimalEnvScores,
          },
          reportText,
          firstName,
        });
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, [assessmentId, clientToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader className="border-indigo-500" />
        <p className="text-sm text-muted-foreground">Loading your results…</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-foreground mb-2">Unable to load results</h1>
        <p className="text-sm text-muted-foreground mb-4">{error ?? 'Unknown error'}</p>
        <a href="/" className="text-sm text-indigo-600 hover:underline">Return home</a>
      </div>
    );
  }

  return (
    <ResultView
      completeResult={result.completeResult}
      reportText={result.reportText}
      userFirstName={result.firstName}
      reportLoading={false}
      reportError={null}
    />
  );
}

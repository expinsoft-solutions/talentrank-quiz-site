'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ResultView } from '@/components/quiz';
import { Loader } from '@/components/ui/loader';
import type { CompleteResult } from '@/components/quiz/ResultView';
import type { PublicStripeSettings } from '@/lib/stripe/types';

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
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [stripeSettings, setStripeSettings] = useState<PublicStripeSettings | null>(null);
  const reportRequestedRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Fetch stripe settings in parallel (non-blocking)
    fetch('/api/stripe/settings')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setStripeSettings(data as PublicStripeSettings); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!assessmentId || !clientToken) {
      setError('Missing assessment or token');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/get-assessment-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessmentId, clientToken }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data?.error === 'string' ? data.error : 'Failed to load results');
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

  useEffect(() => {
    if (!result || !assessmentId || !clientToken || reportRequestedRef.current) return;
    if (result.reportText != null && result.reportText.trim() !== '') return;

    reportRequestedRef.current = true;
    setReportLoading(true);
    setReportError(null);

    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId, clientToken }),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data?.error === 'Report generation not configured') {
          stopPolling();
          setReportError('Report generation is not configured.');
          setReportLoading(false);
        } else if (typeof data?.reportText === 'string' && data.reportText?.trim()) {
          stopPolling();
          setResult((prev) => (prev ? { ...prev, reportText: data.reportText } : null));
          setReportLoading(false);
        }
      })
      .catch(() => {});

    const POLL_INTERVAL_MS = 4500;
    const MAX_POLLS = 60;
    let pollCount = 0;

    const poll = () => {
      pollCount += 1;
      if (pollCount > MAX_POLLS) {
        stopPolling();
        setReportError('Report is taking longer than expected. Please check your email or refresh in a few minutes.');
        setReportLoading(false);
        return;
      }
      fetch('/api/get-assessment-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, clientToken }),
      })
        .then((res) => res.json().catch(() => ({})))
        .then((data) => {
          const reportText = typeof data?.reportText === 'string' ? data.reportText : null;
          if (reportText != null && reportText.trim() !== '') {
            stopPolling();
            setResult((prev) => (prev ? { ...prev, reportText } : null));
            setReportLoading(false);
          }
        });
    };

    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return () => stopPolling();
  }, [result, assessmentId, clientToken]);

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
        <Link href="/" className="text-sm text-indigo-600 hover:underline">Return home</Link>
      </div>
    );
  }

  return (
    <ResultView
      completeResult={result.completeResult}
      reportText={result.reportText}
      userFirstName={result.firstName}
      reportLoading={reportLoading}
      reportError={reportError}
      stripeSettings={stripeSettings}
      assessmentId={assessmentId}
      clientToken={clientToken}
    />
  );
}

'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import { SiteHeader } from '@/components/SiteHeader';
import { LikertSection, ShortAnswerSection } from '@/components/quiz';
import { getOrderedSectionSteps } from '@/lib/assessment';
import type { DbSection, DbQuestion } from '@/types';
import type { SectionStep } from '@/lib/assessment';

type Phase = 'intro' | 'email' | 'questions' | 'complete' | 'redirecting';


function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId');
  const clientToken = searchParams.get('clientToken');

  const [phase, setPhase] = useState<Phase>('intro');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sectionSteps, setSectionSteps] = useState<SectionStep[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, { answerNumeric?: number; answerRaw?: string }>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const submitStartedRef = useRef(false);

  useEffect(() => {
    if (!assessmentId || !clientToken) {
      router.replace('/');
    }
  }, [assessmentId, clientToken, router]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, clientToken, email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Verification failed');
        return;
      }
      if (typeof data?.token === 'string') {
        setToken(data.token);
        const quizRes = await fetch('/api/quiz?type=paid');
        const quizData = await quizRes.json().catch(() => ({}));
        if (quizRes.ok && Array.isArray(quizData?.sections) && Array.isArray(quizData?.questions)) {
          const steps = getOrderedSectionSteps(
            quizData.sections as DbSection[],
            quizData.questions as DbQuestion[],
            {}
          );
          setSectionSteps(steps);
          if (steps.length > 0) {
            setPhase('questions');
          } else {
            setPhase('complete');
          }
        } else {
          setPhase('complete');
        }
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const handleResponseSaved = useCallback((questionId: string, answerNumeric?: number, answerRaw?: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...(answerNumeric != null && { answerNumeric }),
        ...(answerRaw != null && { answerRaw }),
      },
    }));
  }, []);

  const handleSectionComplete = useCallback(() => {
    const next = currentSectionIndex + 1;
    if (next < sectionSteps.length) {
      setCurrentSectionIndex(next);
      setQuestionIndex(0);
      return;
    }
    setPhase('complete');
  }, [currentSectionIndex, sectionSteps.length]);

  const handleSectionProgress = useCallback((sectionIndex: number, qIndex: number) => {
    setQuestionIndex(qIndex);
  }, []);

  useEffect(() => {
    if (phase !== 'complete' || !token || submitStartedRef.current) return;
    submitStartedRef.current = true;
    setSubmitLoading(true);
    const responseList = Object.entries(responses).map(([questionId, v]) => ({
      questionId,
      answerNumeric: v?.answerNumeric ?? null,
      answerRaw: v?.answerRaw ?? null,
    }));
    fetch('/api/submit-paid-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, responses: responseList }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data?.error === 'string' ? data.error : 'Failed to submit');
          setSubmitLoading(false);
          submitStartedRef.current = false;
          return;
        }
        setPhase('redirecting');
        const aid = data?.assessmentId ?? assessmentId;
        const ctok = data?.clientToken ?? clientToken;
        if (aid && ctok) {
          router.push(`/assessment/result?assessmentId=${encodeURIComponent(aid)}&clientToken=${encodeURIComponent(ctok)}`);
        } else {
          router.push('/');
        }
      })
      .catch(() => {
        setError('Network error');
        setSubmitLoading(false);
        submitStartedRef.current = false;
      });
  }, [phase, token, responses, assessmentId, clientToken, router]);

  if (!assessmentId || !clientToken) {
    return null;
  }

  if (phase === 'intro') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background">
        <SiteHeader
          rightAction={
            <Button size="sm" className="rounded-lg bg-[#4c1d95] hover:bg-[#5b21b6] text-white font-medium" asChild>
              <Link href="/">Reveal My TalentRank</Link>
            </Button>
          }
        />
        <div className="container max-w-2xl px-4 py-12 sm:py-16 text-center space-y-6">
          <h1 className="text-3xl font-bold text-foreground">
            Thank you for getting your TalentRank Blueprint 🧠
          </h1>
          <div className="text-left space-y-4 text-muted-foreground">
            <p className="leading-relaxed">
              <strong className="text-foreground">Your Blueprint is a 15–20 page roadmap</strong> designed to help you leverage your unique personality and cognitive wiring and level up in every area.
            </p>
            <p className="leading-relaxed">
              There are only 10 questions here, and this will take you about 5 minutes. Your report will be delivered once you complete this.{' '}
              <u>The more detail you give, the better your Blueprint will be.</u>
            </p>
            <p className="leading-relaxed">
              <strong className="text-foreground">Important note:</strong> Make sure you use the same email you used when taking the quiz initially or you will not receive your report.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setPhase('email')}
            className="bg-[#4c1d95] hover:bg-[#5b21b6] text-white font-medium rounded-lg"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'email') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background">
        <SiteHeader
          rightAction={
            <Button size="sm" className="rounded-lg bg-[#4c1d95] hover:bg-[#5b21b6] text-white font-medium" asChild>
              <Link href="/">Reveal My TalentRank</Link>
            </Button>
          }
        />
        <div className="min-h-[calc(100dvh-3.5rem)] flex flex-col items-center justify-center px-4 py-12 max-w-md mx-auto">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-2 tracking-tight text-center">
            Verify your email
          </h1>
          <p className="text-sm text-muted-foreground mb-6 text-center">
            Enter the same email you used when taking the quiz.
          </p>
          <form onSubmit={handleEmailSubmit} className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-email">Email</Label>
              <Input
                id="onboarding-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="h-11 rounded-lg"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full h-11 font-medium rounded-lg bg-[#4c1d95] hover:bg-[#5b21b6]"
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader size="sm" />
                  Verifying…
                </span>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (phase === 'questions' && sectionSteps.length > 0) {
    const step = sectionSteps[currentSectionIndex];
    if (!step) return null;
    const hasShortAnswer = step.questions.some(
      (q) => q.type === 'short_answer' || q.type === 'text'
    );
    const sectionInitialAnswers: Record<string, string | number> = {};
    const likertInitialAnswers: Array<{ id: string; answer: number }> = [];
    for (const q of step.questions) {
      const r = responses[q.id];
      if (r?.answerNumeric != null) {
        sectionInitialAnswers[q.id] = r.answerNumeric;
        likertInitialAnswers.push({ id: q.id, answer: r.answerNumeric });
      }
      if (r?.answerRaw != null) sectionInitialAnswers[q.id] = r.answerRaw;
    }
    if (hasShortAnswer) {
      return (
        <div className="min-h-screen min-h-[100dvh] bg-background w-full overflow-x-hidden">
          <ShortAnswerSection
            sectionId={step.sectionId}
            sectionIndex={step.orderIndex}
            totalSections={sectionSteps.length}
            questions={step.questions}
            initialAnswers={Object.keys(sectionInitialAnswers).length > 0 ? sectionInitialAnswers : undefined}
            initialQuestionIndex={questionIndex}
            onComplete={handleSectionComplete}
            onProgress={handleSectionProgress}
            onResponseSaved={(q, num?, raw?) => handleResponseSaved(q, num, raw)}
          />
        </div>
      );
    }
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background w-full overflow-x-hidden">
        <LikertSection
          sectionId={step.sectionId}
          sectionIndex={step.orderIndex}
          totalSections={sectionSteps.length}
          questions={step.questions.map((q) => ({
            ...q,
            keyed: (q.keyed ?? (q.reverseScored ? 'negative' : 'positive')) as 'positive' | 'negative',
          }))}
          initialAnswers={likertInitialAnswers.length > 0 ? likertInitialAnswers : undefined}
          initialQuestionIndex={questionIndex}
          onComplete={() => handleSectionComplete()}
          onProgress={handleSectionProgress}
          onResponseSaved={(q, num) => handleResponseSaved(q, num, undefined)}
        />
      </div>
    );
  }

  if (phase === 'complete' || phase === 'redirecting') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 py-12">
        {submitLoading || phase === 'redirecting' ? (
          <>
            <Loader size="lg" />
            <p className="mt-4 text-sm text-muted-foreground">
              Preparing your report…
            </p>
          </>
        ) : error ? (
          <div className="text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={() => setPhase('questions')} variant="outline">
              Try again
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

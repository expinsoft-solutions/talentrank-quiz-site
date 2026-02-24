'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { getResumeState, setResumeState, clearResumeState } from '@/lib/resume-storage';
import { getOrderedSectionSteps, getFallbackSectionSteps } from '@/lib/assessment';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    setHasResume(getResumeState() !== null);
  }, []);

  async function handleStart(clearExisting = false) {
    if (clearExisting) {
      clearResumeState();
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/quiz');
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Failed to load quiz');
        setLoading(false);
        return;
      }
      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      const { version, sections = [], questions = [] } = data;
      const sectionSteps = getOrderedSectionSteps(sections, questions, {});
      const steps = sectionSteps.length > 0 ? sectionSteps : getFallbackSectionSteps();
      if (steps.length > 0) {
        setResumeState({
          version: version ?? 'v1.0',
          phase: 'section',
          sectionIndex: 0,
          questionIndex: 0,
          sections,
          questions,
          responses: {},
        });
        router.push('/assessment');
      } else {
        setError('No questions available');
        setLoading(false);
      }
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4 sm:px-6">
          <img src="/logo.png" alt="TalentRank" className="h-8 w-auto object-contain" />
          <Button
            size="sm"
            onClick={hasResume ? () => router.push('/assessment') : () => handleStart()}
            disabled={loading}
            className="rounded-lg bg-[#4c1d95] hover:bg-[#5b21b6] text-white font-medium"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader size="sm" className="border-t-white" />
                Starting…
              </span>
            ) : (
              'Reveal My TalentRank'
            )}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-indigo-50/80 via-background to-background dark:from-indigo-950/20 dark:via-background dark:to-background">
        <div className="container relative mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Discover how you&apos;re wired and where you shine
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Take the TalentRank assessment to get your personality type, axis strengths, cognitive estimate, and a personalized report — in under 15 minutes.
          </p>
          {error && (
            <p className="mx-auto mt-4 max-w-md text-sm text-destructive">{error}</p>
          )}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={hasResume ? () => router.push('/assessment') : () => handleStart()}
              disabled={loading}
              className="min-w-[220px] h-12 text-base font-medium rounded-lg bg-[#4c1d95] hover:bg-[#5b21b6] text-white shadow-md"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader size="sm" className="border-t-white" />
                  Starting…
                </span>
              ) : hasResume ? (
                'Resume assessment'
              ) : (
                'Start free assessment'
              )}
            </Button>
            {hasResume && !loading && (
              <button
                type="button"
                onClick={() => handleStart(true)}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Start over
              </button>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No sign-up required to start. Your results are private.
          </p>
        </div>
      </section>

      {/* What you get */}
      <section className="border-b border-border/40 py-16 sm:py-20">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            What you get
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
            A clear picture of your strengths and how you work best.
          </p>
          <ul className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2 sm:gap-8">
            <li className="flex gap-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
              <span className="text-2xl" aria-hidden>🧠</span>
              <div>
                <h3 className="font-semibold text-foreground">Personality type</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your 4-letter type and axis strengths so you know how you think, communicate, and make decisions.
                </p>
              </div>
            </li>
            <li className="flex gap-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
              <span className="text-2xl" aria-hidden>⚡</span>
              <div>
                <h3 className="font-semibold text-foreground">Cognitive estimate</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  An estimated range and percentile so you understand where you stand.
                </p>
              </div>
            </li>
            <li className="flex gap-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
              <span className="text-2xl" aria-hidden>📋</span>
              <div>
                <h3 className="font-semibold text-foreground">Sabotage & environment</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Patterns that may hold you back and the conditions where you perform best.
                </p>
              </div>
            </li>
            <li className="flex gap-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
              <span className="text-2xl" aria-hidden>📜</span>
              <div>
                <h3 className="font-semibold text-foreground">Personalized report</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A written report tailored to your results — your archetype and what it means for you.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border/40 py-16 sm:py-20">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            How it works
          </h2>
          <div className="mx-auto mt-12 flex max-w-2xl flex-col gap-8 sm:gap-10">
            <div className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4c1d95] text-sm font-semibold text-white">1</span>
              <div>
                <h3 className="font-semibold text-foreground">Answer the questions</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Go through short sections on personality, self-sabotage, environment fit, and more. No right or wrong answers.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4c1d95] text-sm font-semibold text-white">2</span>
              <div>
                <h3 className="font-semibold text-foreground">Get your results</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  We score your responses and show your type, strengths, and a personalized report you can use right away.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4c1d95] text-sm font-semibold text-white">3</span>
              <div>
                <h3 className="font-semibold text-foreground">Use your blueprint</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Apply your TalentRank profile to career choices, teamwork, and personal growth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof / CTA */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <p className="text-lg font-medium text-foreground sm:text-xl">
            Join thousands who&apos;ve unlocked their cognitive blueprint.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            &quot;Something literally everyone should know about themselves&quot;
          </p>
          <div className="mt-10">
            <Button
              size="lg"
              onClick={hasResume ? () => router.push('/assessment') : () => handleStart()}
              disabled={loading}
              className="min-w-[220px] h-12 text-base font-medium rounded-lg bg-[#4c1d95] hover:bg-[#5b21b6] text-white shadow-md"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader size="sm" className="border-t-white" />
                  Starting…
                </span>
              ) : hasResume ? (
                'Resume assessment'
              ) : (
                'Start free assessment'
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 text-center text-sm text-muted-foreground">
          <p>© TalentRank. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import type { StartAssessmentResponse } from '@/types';

interface WelcomeScreenProps {
  onStart: (data: StartAssessmentResponse) => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setError(null);
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('start-assessment', {
        body: {},
      });
      if (fnError) {
        setError(fnError.message ?? 'Failed to start assessment');
        return;
      }
      if (data?.error) {
        setError(data.error);
        return;
      }
      onStart(data as StartAssessmentResponse);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-4 xs:px-6 sm:px-8 py-8 xs:py-12 sm:py-16 max-w-lg mx-auto w-full text-center safe-top safe-bottom">
      <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-foreground mb-3 xs:mb-4 tracking-tight px-1">
        Welcome to TalentRank
      </h1>
      <p className="text-muted-foreground text-base xs:text-lg mb-2 leading-relaxed px-1">
        Discover your personality wiring, work-style fit, and strengths.
      </p>
      <p className="text-sm text-muted-foreground/90 mb-8 xs:mb-12 max-w-md leading-relaxed px-1">
        Answer honestly — there are no right or wrong answers. Your progress is saved as you go.
      </p>
      {error && (
        <p className="text-sm text-destructive mb-4 px-2">{error}</p>
      )}
      <Button
        type="button"
        onClick={handleStart}
        disabled={loading}
        size="lg"
        className="w-full max-w-[280px] min-w-0 xs:min-w-[220px] h-11 xs:h-12 text-sm xs:text-base font-medium shadow-sm hover:shadow transition-shadow touch-manipulation"
      >
        {loading ? 'Starting…' : 'Start Quiz'}
      </Button>
    </div>
  );
}

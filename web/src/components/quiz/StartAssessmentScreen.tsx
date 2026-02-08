'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { StartAssessmentResponse } from '@/types';

interface StartAssessmentScreenProps {
  onStart: (data: StartAssessmentResponse) => void;
}

export function StartAssessmentScreen({ onStart }: StartAssessmentScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to start assessment');
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        TalentRank Assessment
      </h1>
      <p className="text-sm text-muted-foreground mb-8 text-center">
        Answer the questions. Your progress is saved as you go.
      </p>
      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}
      <Button
        type="button"
        onClick={handleStart}
        disabled={loading}
        className="w-full min-w-[200px]"
      >
        {loading ? 'Starting…' : 'Start Quiz'}
      </Button>
    </div>
  );
}

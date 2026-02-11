'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

interface CollectUserScreenProps {
  assessmentId: string;
  device: 'desktop' | 'mobile' | 'tablet';
  onSaved: () => void;
}

export function CollectUserScreen({
  assessmentId,
  device,
  onSaved,
}: CollectUserScreenProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('update-assessment-user', {
        body: {
          assessmentId,
          email: trimmed,
          firstName: firstName.trim() || undefined,
          device,
        },
      });
      if (fnError) {
        setError(fnError.message ?? 'Failed to save');
        return;
      }
      if (data?.error) {
        setError(data.error);
        return;
      }
      onSaved();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-4 xs:px-6 sm:px-6 py-8 xs:py-12 max-w-md mx-auto w-full safe-top safe-bottom">
      <h1 className="text-xl xs:text-2xl sm:text-3xl font-semibold text-foreground mb-2 xs:mb-3 tracking-tight text-center w-full">
        Get your results
      </h1>
      <p className="text-sm text-muted-foreground mb-6 xs:mb-8 text-center leading-relaxed w-full px-1">
        Enter your details to save your assessment and view your report.
      </p>
      <form onSubmit={handleSubmit} className="w-full max-w-full min-w-0 space-y-4 xs:space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            className="w-full min-w-0 h-11 rounded-lg text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium">First name</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Alex"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={loading}
            className="w-full min-w-0 h-11 rounded-lg text-base"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button
          type="submit"
          className="w-full h-11 xs:h-12 text-sm xs:text-base font-medium shadow-sm hover:shadow transition-shadow mt-2 touch-manipulation"
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Save & view results'}
        </Button>
      </form>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12 text-center bg-background">
      <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        An unexpected error occurred. You can try again or return to the home page.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={reset} className="min-w-[120px]">
          Try again
        </Button>
        <Button asChild variant="default" className="min-w-[120px]">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}

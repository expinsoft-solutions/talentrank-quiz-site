'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const qs = params.toString();
    router.replace(qs ? `/blueprint?${qs}` : '/blueprint');
  }, [router, searchParams]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  );
}

export default function OnboardingRedirect() {
  return (
    <Suspense fallback={
      <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    }>
      <RedirectContent />
    </Suspense>
  );
}

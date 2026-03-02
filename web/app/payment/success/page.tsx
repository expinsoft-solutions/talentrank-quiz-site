'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId');
  const clientToken = searchParams.get('clientToken');

  const onboardingHref =
    assessmentId && clientToken
      ? `/onboarding?assessmentId=${encodeURIComponent(assessmentId)}&clientToken=${encodeURIComponent(clientToken)}`
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Thank you for your order.
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Next, click the button below. You&apos;ll answer a few more questions so we&apos;re able to make your report as valuable as possible. It will take about 3–5 minutes.
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            We can&apos;t generate your report without this. If you upgrade your report below, you&apos;ll be brought back to this page after purchase.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {onboardingHref ? (
            <Button asChild className="bg-violet-700 hover:bg-violet-800 text-white h-12 px-8 rounded-lg font-medium">
              <Link href={onboardingHref}>Start Quiz Now</Link>
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Missing assessment info. Please return to the assessment and complete your purchase from there.
              </p>
              <Button asChild variant="outline" className="rounded-lg">
                <Link href="/">Return home</Link>
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400">
          A receipt has been sent to your email by Stripe.
        </p>
      </div>
    </div>
  );
}

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

  const resultsHref =
    assessmentId && clientToken
      ? `/assessment/result?assessmentId=${encodeURIComponent(assessmentId)}&clientToken=${encodeURIComponent(clientToken)}`
      : '/';

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Payment Successful!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Thank you for your purchase. Your advanced TalentRank report is ready.
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 space-y-3 shadow-sm">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            You now have access to your full cognitive blueprint — including your detailed blockers, traits, habits, and a personalized career action plan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-violet-700 hover:bg-violet-800 text-white h-12 px-8 rounded-lg font-medium">
            <Link href={resultsHref}>
              View My Full Report →
            </Link>
          </Button>
        </div>

        <p className="text-xs text-slate-400">
          A receipt has been sent to your email by Stripe.
        </p>
      </div>
    </div>
  );
}

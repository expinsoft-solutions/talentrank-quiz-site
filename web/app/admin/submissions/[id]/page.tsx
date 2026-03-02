'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Loader } from '@/components/ui/loader';

interface Attempt {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  mbti: string | null;
  axisStrengths: Record<string, number> | null;
  cognitivePercentile: number | null;
  neuroticismScore: number | null;
  reportText: string | null;
  reportModel: string | null;
}

interface ResponseRow {
  questionId: string;
  answerNumeric: number | null;
  answerRaw: string | null;
  timeTakenSeconds: number | null;
}

export default function AdminSubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [user, setUser] = useState<Record<string, unknown>>({});
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/submissions/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((d) => {
        setAttempt(d.attempt);
        setUser(d.user ?? {});
        setResponses(d.responses ?? []);
      })
      .catch(() => router.push('/admin/submissions'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !attempt) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  const axisEntries = attempt.axisStrengths
    ? Object.entries(attempt.axisStrengths).sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/submissions"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to submissions
      </Link>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h1 className="text-xl font-semibold">Submission #{id.slice(0, 8)}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-500 block">Email</span>
            <span>{(user.email as string) ?? '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Name</span>
            <span>{(user.firstName as string) ?? '—'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Status</span>
            <span
              className={
                attempt.status === 'completed'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400'
              }
            >
              {attempt.status}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Started</span>
            <span>
              {attempt.startedAt
                ? format(new Date(attempt.startedAt), 'PPpp')
                : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Completed</span>
            <span>
              {attempt.completedAt
                ? format(new Date(attempt.completedAt), 'PPpp')
                : '—'}
            </span>
          </div>
        </div>

        {attempt.status === 'completed' && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex gap-4">
              <div>
                <span className="text-slate-500 text-sm block">MBTI</span>
                <span className="font-mono font-medium">{attempt.mbti ?? '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-sm block">IQ Percentile</span>
                <span>{attempt.cognitivePercentile ?? '—'}</span>
              </div>
              {attempt.neuroticismScore != null && (
                <div>
                  <span className="text-slate-500 text-sm block">Neuroticism</span>
                  <span>{attempt.neuroticismScore}</span>
                </div>
              )}
              {attempt.reportModel && (
                <div>
                  <span className="text-slate-500 text-sm block">Report model</span>
                  <span className="font-mono text-sm">{attempt.reportModel}</span>
                </div>
              )}
            </div>
            {axisEntries.length > 0 && (
              <div>
                <span className="text-slate-500 text-sm block mb-1">
                  Axis strengths
                </span>
                <div className="flex flex-wrap gap-2">
                  {axisEntries.map(([axis, value]) => (
                    <span
                      key={axis}
                      className="inline-flex rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium"
                    >
                      {axis}: {value}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {attempt.reportText && (
              <div className="pt-4">
                <span className="text-slate-500 text-sm block mb-2">Report</span>
                <div className="rounded bg-slate-50 dark:bg-slate-800/50 p-4 text-sm whitespace-pre-wrap">
                  {attempt.reportText}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <h2 className="p-4 font-medium border-b border-slate-200 dark:border-slate-700">
          Responses ({responses.length})
        </h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {responses.map((r) => (
            <div
              key={r.questionId}
              className="p-4 flex justify-between gap-4 items-start"
            >
              <span className="font-mono text-xs text-slate-500 shrink-0">
                {r.questionId}
              </span>
              <div className="min-w-0 flex-1 text-right">
                {r.answerNumeric != null && (
                  <span className="font-medium">{r.answerNumeric}</span>
                )}
                {r.answerRaw && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 truncate max-w-md ml-auto">
                    {r.answerRaw}
                  </p>
                )}
                {r.answerNumeric == null && !r.answerRaw && (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
          ))}
          {responses.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No responses recorded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { CloudUpload } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Submission {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  mbti: string | null;
  cognitivePercentile: number | null;
  reportModel: string | null;
  user: { email?: string; firstName?: string };
}

export default function AdminSubmissionsPage() {
  const [items, setItems] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [exportingAll, setExportingAll] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    params.set('limit', '50');
    fetch(`/api/admin/submissions?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((d) => {
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  async function handleExportAll() {
    if (items.length === 0) {
      toast.error('No submissions to export');
      return;
    }
    setExportingAll(true);
    try {
      const res = await fetch('/api/admin/submissions/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentIds: items.map((i) => i.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Export failed');
        return;
      }
      const results = data.results ?? [];
      const ok = results.filter((r: { ok: boolean }) => r.ok).length;
      const failed = results.filter((r: { ok: boolean }) => !r.ok).length;
      if (failed === 0) {
        toast.success(`Exported ${ok} submission${ok !== 1 ? 's' : ''} to Airtable`);
      } else if (ok === 0) {
        toast.error(`Export failed for all ${failed} submission${failed !== 1 ? 's' : ''}`);
      } else {
        toast.warning(`Exported ${ok}, failed ${failed}`);
      }
    } catch {
      toast.error('Export failed');
    } finally {
      setExportingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            disabled={exportingAll || items.length === 0}
            onClick={handleExportAll}
            className="shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white border-0 gap-2"
          >
            {exportingAll ? (
              <Loader size="sm" className="shrink-0" />
            ) : (
              <CloudUpload className="h-4 w-4 shrink-0" />
            )}
            <span>{exportingAll ? 'Exporting…' : 'Export to Airtable'}</span>
          </Button>
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('completed')}
          >
            Completed
          </Button>
          <Button
            variant={statusFilter === 'started' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('started')}
          >
            In progress
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left p-3 font-medium">Started</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">MBTI</th>
                <th className="text-left p-3 font-medium">IQ %ile</th>
                <th className="text-left p-3 font-medium">Report model</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="p-3 text-slate-600 dark:text-slate-400">
                    {row.startedAt
                      ? format(new Date(row.startedAt), 'MMM d, yyyy HH:mm')
                      : '—'}
                  </td>
                  <td className="p-3">
                    {(row.user as { email?: string })?.email ?? '—'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono">{row.mbti ?? '—'}</td>
                  <td className="p-3">{row.cognitivePercentile ?? '—'}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{row.reportModel ?? '—'}</td>
                  <td className="p-3">
                    <Link
                      href={`/admin/submissions/${row.id}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            No submissions found
          </div>
        )}
      </div>
    </div>
  );
}

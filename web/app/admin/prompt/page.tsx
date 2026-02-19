'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

const DEFAULT_MODEL = 'claude-3-haiku-20240307';

export default function AdminPromptPage() {
  const [reportSystemPrompt, setReportSystemPrompt] = useState('');
  const [reportModel, setReportModel] = useState(DEFAULT_MODEL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/report-prompt')
      .then((res) => (res.ok ? res.json() : { reportSystemPrompt: '', reportModel: DEFAULT_MODEL }))
      .then((data) => {
        setReportSystemPrompt(data.reportSystemPrompt ?? '');
        setReportModel(data.reportModel ?? DEFAULT_MODEL);
      })
      .catch(() => {
        setReportSystemPrompt('');
        setReportModel(DEFAULT_MODEL);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/report-prompt', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportSystemPrompt, reportModel }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Failed to save AI settings');
        setSaving(false);
        return;
      }
      toast.success('AI settings saved');
    } catch {
      toast.error('Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">AI settings</h1>
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-500" />
          <h2 className="font-medium">AI report configuration</h2>
        </div>
        <p className="text-sm text-slate-500">
          Control how Claude generates reports. Leave fields empty to fall back to safe defaults.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="report-model">Claude model</Label>
            <Input
              id="report-model"
              type="text"
              value={reportModel}
              onChange={(e) => setReportModel(e.target.value)}
              placeholder={DEFAULT_MODEL}
              disabled={loading}
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Full Claude model ID, e.g. <code>{DEFAULT_MODEL}</code>. Leave empty to use the default model.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-prompt">System prompt</Label>
            <Textarea
              id="report-prompt"
              value={reportSystemPrompt}
              onChange={(e) => setReportSystemPrompt(e.target.value)}
              placeholder="Leave empty to use the default system prompt in code…"
              disabled={loading}
              className="min-h-[280px] font-mono text-sm resize-y"
              spellCheck={false}
            />
            <p className="text-xs text-slate-500">
              High-level instructions given to Claude before user data. Leave empty for the built-in prompt.
            </p>
          </div>

          <Button type="submit" disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save AI settings'}
          </Button>
        </form>
      </div>
    </div>
  );
}

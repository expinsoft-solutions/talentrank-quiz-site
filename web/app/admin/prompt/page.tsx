'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';

const DEFAULT_MODEL = 'claude-3-haiku-20240307';

interface ModelOption {
  id: string;
  displayName: string;
}

export default function AdminPromptPage() {
  const [reportSystemPrompt, setReportSystemPrompt] = useState('');
  const [paidReportSystemPrompt, setPaidReportSystemPrompt] = useState('');
  const [reportModel, setReportModel] = useState(DEFAULT_MODEL);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/report-prompt').then((res) =>
        res.ok ? res.json() : { reportSystemPrompt: '', reportModel: DEFAULT_MODEL }
      ),
      fetch('/api/admin/claude-models').then((res) =>
        res.ok ? res.json() : { models: [] }
      ),
    ])
      .then(([promptData, modelsData]) => {
        setReportSystemPrompt(promptData.reportSystemPrompt ?? '');
        setPaidReportSystemPrompt(promptData.paidReportSystemPrompt ?? '');
        setReportModel(promptData.reportModel ?? DEFAULT_MODEL);
        setModels(modelsData.models ?? []);
      })
      .catch(() => {
        setReportSystemPrompt('');
        setPaidReportSystemPrompt('');
        setReportModel(DEFAULT_MODEL);
        setModels([]);
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
        body: JSON.stringify({ reportSystemPrompt, paidReportSystemPrompt, reportModel }),
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
            <Select
              value={reportModel || DEFAULT_MODEL}
              onValueChange={(v) => setReportModel(v || DEFAULT_MODEL)}
              disabled={loading}
            >
              <SelectTrigger id="report-model" className="font-mono text-sm">
                <SelectValue placeholder={DEFAULT_MODEL} />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const current = reportModel || DEFAULT_MODEL;
                  const hasCurrent = models.some((m) => m.id === current);
                  const options = hasCurrent
                    ? models
                    : [...models, { id: current, displayName: `${current} (saved)` }];
                  return options.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="font-mono">
                      {m.displayName}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Model used for report generation. Loaded from Anthropic API when ANTHROPIC_API_KEY is set.
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

          <div className="space-y-2">
            <Label htmlFor="paid-report-prompt">Paid report system prompt</Label>
            <Textarea
              id="paid-report-prompt"
              value={paidReportSystemPrompt}
              onChange={(e) => setPaidReportSystemPrompt(e.target.value)}
              placeholder="Leave empty to use regular system prompt/default for paid users…"
              disabled={loading}
              className="min-h-[280px] font-mono text-sm resize-y"
              spellCheck={false}
            />
            <p className="text-xs text-slate-500">
              Used only when the assessment attempt includes paid responses. If empty, regular system prompt is used.
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

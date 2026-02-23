'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Video } from 'lucide-react';

export default function AdminVslPage() {
  const [vslEnabled, setVslEnabled] = useState(true);
  const [vslType, setVslType] = useState<'internal' | 'external'>('internal');
  const [vslUrl, setVslUrl] = useState('/vsl');
  const [vslEmbedUrl, setVslEmbedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/vsl-settings')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data) => {
        setVslEnabled(data.vslEnabled ?? true);
        setVslType(data.vslType === 'external' ? 'external' : 'internal');
        setVslUrl(typeof data.vslUrl === 'string' ? data.vslUrl : '/vsl');
        setVslEmbedUrl(typeof data.vslEmbedUrl === 'string' ? data.vslEmbedUrl : '');
      })
      .catch(() => toast.error('Failed to load VSL settings'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/vsl-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vslEnabled,
          vslType,
          vslUrl: vslUrl.trim() || '/vsl',
          vslEmbedUrl: vslEmbedUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to save');
        setSaving(false);
        return;
      }
      toast.success('VSL settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-slate-500">Loading VSL settings…</div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">VSL customization</h1>
      <p className="text-sm text-slate-500">
        Configure the video / report-generation page shown after users complete the assessment. When VSL is enabled, users are redirected here before seeing results.
      </p>

      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-slate-500" />
          <h2 className="font-medium">VSL settings</h2>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="vsl-enabled"
            checked={vslEnabled}
            onChange={(e) => setVslEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <Label htmlFor="vsl-enabled" className="cursor-pointer">
            Enable VSL redirect after assessment
          </Label>
        </div>

        <div className="space-y-2">
          <Label>Redirect type</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="vsl-type"
                checked={vslType === 'internal'}
                onChange={() => setVslType('internal')}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Internal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="vsl-type"
                checked={vslType === 'external'}
                onChange={() => setVslType('external')}
                className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>External</span>
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Internal: redirect to your /vsl page. External: redirect to the URL below (e.g. another domain). assessment_id and client_token are appended as query params for external.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vsl-url">VSL URL</Label>
          <Input
            id="vsl-url"
            type="text"
            value={vslUrl}
            onChange={(e) => setVslUrl(e.target.value)}
            placeholder="/vsl"
            className="h-10"
          />
          <p className="text-xs text-slate-500">
            For internal: path only (e.g. /vsl). For external: full URL (e.g. https://app.talentrank.io/video).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vsl-embed-url">Video embed URL</Label>
          <Input
            id="vsl-embed-url"
            type="url"
            value={vslEmbedUrl}
            onChange={(e) => setVslEmbedUrl(e.target.value)}
            placeholder="https://www.youtube.com/embed/..."
            className="h-10"
          />
          <p className="text-xs text-slate-500">
            YouTube embed URL or other iframe-compatible video URL shown on the VSL page (e.g. https://www.youtube.com/embed/VIDEO_ID).
          </p>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save VSL settings'}
        </Button>
      </form>
    </div>
  );
}

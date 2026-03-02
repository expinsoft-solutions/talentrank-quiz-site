'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Video, PlayCircle, FileText } from 'lucide-react';
import { Loader } from '@/components/ui/loader';

export default function AdminVslPage() {
  const [vslEnabled, setVslEnabled] = useState(true);
  const [vslType, setVslType] = useState<'internal' | 'external'>('internal');
  const [vslUrl, setVslUrl] = useState('/vsl');
  const [vslWistiaMediaId, setVslWistiaMediaId] = useState('mfxlojyy76');
  const [vslHeadline, setVslHeadline] = useState('Your Custom Report Is Being Generated...');
  const [vslSubtitle, setVslSubtitle] = useState('Your AI Analysis takes 3-5 minutes to complete. While it processes, watch this explanation of what makes your assessment different from every personality test you\'ve taken.');
  const [vslTestimonial, setVslTestimonial] = useState('"Something literally everyone should know about themselves" — Sarah M.');
  const [vslRequireCompletion, setVslRequireCompletion] = useState(true);
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
        setVslWistiaMediaId(typeof data.vslWistiaMediaId === 'string' ? data.vslWistiaMediaId : 'mfxlojyy76');
        setVslHeadline(typeof data.vslHeadline === 'string' ? data.vslHeadline : 'Your Custom Report Is Being Generated...');
        setVslSubtitle(typeof data.vslSubtitle === 'string' ? data.vslSubtitle : 'Your AI Analysis takes 3-5 minutes to complete. While it processes, watch this explanation of what makes your assessment different from every personality test you\'ve taken.');
        setVslTestimonial(typeof data.vslTestimonial === 'string' ? data.vslTestimonial : '"Something literally everyone should know about themselves" — Sarah M.');
        setVslRequireCompletion(data.vslRequireCompletion !== false);
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
          vslWistiaMediaId: vslWistiaMediaId.trim() || 'mfxlojyy76',
          vslHeadline: vslHeadline.trim() || 'Your Custom Report Is Being Generated...',
          vslSubtitle: vslSubtitle.trim(),
          vslTestimonial: vslTestimonial.trim(),
          vslRequireCompletion,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to save');
        setSaving(false);
        return;
      }
      toast.success('Video service settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">VSL customization</h1>
      <p className="text-sm text-slate-500">
        Configure the video service shown after users complete the assessment. When enabled, users are redirected to the video page before seeing results.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-slate-500" />
            <h2 className="font-medium">Video service</h2>
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
              Enable video page redirect after assessment
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vsl-wistia-media-id">Wistia media ID</Label>
            <Input
              id="vsl-wistia-media-id"
              type="text"
              value={vslWistiaMediaId}
              onChange={(e) => setVslWistiaMediaId(e.target.value)}
              placeholder="mfxlojyy76"
              className="h-10"
            />
            <p className="text-xs text-slate-500">
              From your Wistia video URL: wistia.com/medias/mfxlojyy76
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="vsl-require-completion"
              checked={vslRequireCompletion}
              onChange={(e) => setVslRequireCompletion(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <Label htmlFor="vsl-require-completion" className="cursor-pointer">
              Require video completion before showing results
            </Label>
          </div>
          <p className="text-xs text-slate-500 -mt-2">
            When checked, users must watch the video to completion (or have no video) to proceed.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-slate-500" />
            <h2 className="font-medium">Redirect</h2>
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
              Internal: redirect to your site. External: redirect to another domain. assessmentId and clientToken are appended as query params.
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
              Internal: path only (e.g. /vsl). External: full URL.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-500" />
            <h2 className="font-medium">Page copy</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vsl-headline">Headline</Label>
            <Input
              id="vsl-headline"
              type="text"
              value={vslHeadline}
              onChange={(e) => setVslHeadline(e.target.value)}
              placeholder="Your Custom Report Is Being Generated..."
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vsl-subtitle">Subtitle</Label>
            <Textarea
              id="vsl-subtitle"
              value={vslSubtitle}
              onChange={(e) => setVslSubtitle(e.target.value)}
              placeholder="Your AI Analysis takes 3-5 minutes..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vsl-testimonial">Testimonial</Label>
            <Input
              id="vsl-testimonial"
              type="text"
              value={vslTestimonial}
              onChange={(e) => setVslTestimonial(e.target.value)}
              placeholder='"Something literally everyone should know..."'
              className="h-10"
            />
          </div>
        </section>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save video service settings'}
        </Button>
      </form>
    </div>
  );
}

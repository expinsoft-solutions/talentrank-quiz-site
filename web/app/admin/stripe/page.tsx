'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';

export default function AdminStripePage() {
  const [enabled, setEnabled] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [priceId, setPriceId] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [hasSecretKey, setHasSecretKey] = useState(false);
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/stripe-settings')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data) => {
        setEnabled(data.enabled ?? false);
        setPublishableKey(data.publishableKey ?? '');
        setPriceId(data.priceId ?? '');
        setProductName(data.productName ?? '');
        setProductDescription(data.productDescription ?? '');
        setPriceDisplay(data.priceDisplay ?? '');
        setHasSecretKey(data.hasSecretKey ?? false);
        setHasWebhookSecret(data.hasWebhookSecret ?? false);
        // Leave secret fields blank so user must re-enter to update
      })
      .catch(() => toast.error('Failed to load Stripe settings'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        enabled,
        publishableKey,
        priceId,
        productName,
        productDescription,
        priceDisplay,
      };
      // Only include secret fields if the user typed a new value
      if (secretKey.trim() !== '') body.secretKey = secretKey.trim();
      if (webhookSecret.trim() !== '') body.webhookSecret = webhookSecret.trim();

      const res = await fetch('/api/admin/stripe-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to save');
        return;
      }
      toast.success('Stripe settings saved');
      // Refresh to reflect new "has key" state
      if (secretKey.trim() !== '') setHasSecretKey(true);
      if (webhookSecret.trim() !== '') setHasWebhookSecret(true);
      setSecretKey('');
      setWebhookSecret('');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Loading Stripe settings…</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Stripe settings</h1>
      <p className="text-sm text-slate-500">
        Configure Stripe to accept one-time payments on the results page. All keys are stored securely server-side.
      </p>

      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-slate-500" />
          <h2 className="font-medium">Payment configuration</h2>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="stripe-enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <Label htmlFor="stripe-enabled" className="cursor-pointer">
            Show payment section on results page
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secret-key">
            Stripe Secret Key
            {hasSecretKey && <span className="ml-2 text-xs text-green-600 font-normal">✓ Configured</span>}
          </Label>
          <Input
            id="secret-key"
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder={hasSecretKey ? 'Leave blank to keep existing key' : 'sk_live_... or sk_test_...'}
            className="h-10 font-mono text-sm"
            autoComplete="off"
          />
          <p className="text-xs text-slate-500">
            From Stripe Dashboard → Developers → API Keys. Never shared with the browser.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="publishable-key">Stripe Publishable Key</Label>
          <Input
            id="publishable-key"
            type="text"
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
            placeholder="pk_live_... or pk_test_..."
            className="h-10 font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-secret">
            Webhook Secret
            {hasWebhookSecret && <span className="ml-2 text-xs text-green-600 font-normal">✓ Configured</span>}
          </Label>
          <Input
            id="webhook-secret"
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder={hasWebhookSecret ? 'Leave blank to keep existing secret' : 'whsec_...'}
            className="h-10 font-mono text-sm"
            autoComplete="off"
          />
          <p className="text-xs text-slate-500">
            From Stripe Dashboard → Developers → Webhooks. Endpoint URL: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/api/stripe/webhook</code>
          </p>
        </div>

        <hr className="border-slate-200 dark:border-slate-700" />

        <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300">Product display</h3>

        <div className="space-y-2">
          <Label htmlFor="price-id">Stripe Price ID</Label>
          <Input
            id="price-id"
            type="text"
            value={priceId}
            onChange={(e) => setPriceId(e.target.value)}
            placeholder="price_1Pmr..."
            className="h-10 font-mono text-sm"
          />
          <p className="text-xs text-slate-500">One-time price ID from Stripe Dashboard → Products.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-name">Product Name</Label>
          <Input
            id="product-name"
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Advanced TalentRank Report"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-description">Product Description</Label>
          <textarea
            id="product-description"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="Unlock your full cognitive blueprint…"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price-display">Display Price</Label>
          <Input
            id="price-display"
            type="text"
            value={priceDisplay}
            onChange={(e) => setPriceDisplay(e.target.value)}
            placeholder="$97"
            className="h-10 w-32"
          />
          <p className="text-xs text-slate-500">Shown on the results page CTA (e.g. "$97"). Stripe charges the actual price from the Price ID.</p>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Stripe settings'}
        </Button>
      </form>
    </div>
  );
}

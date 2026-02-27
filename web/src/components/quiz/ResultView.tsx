'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PublicStripeSettings } from '@/lib/stripe/types';
import {
  getAxisDisplayEntries,
  getSabotageProfile,
  getEnvDisplay,
  getCognitiveTier,
  getCognitiveRange,
  getMbtiBlurb,
  getCognitiveBlurb,
  getPercentileRoomBlurb,
} from '@/lib/result-display';

export interface CompleteResult {
  mbti: string;
  axisStrengths: Record<string, number>;
  iqPercentile: number;
  selfSabotageScores?: Record<string, number>;
  optimalEnvScores?: Record<string, number>;
}

interface ResultViewProps {
  completeResult: CompleteResult;
  reportText: string | null;
  userFirstName: string | null;
  reportLoading?: boolean;
  reportError?: string | null;
  stripeSettings?: PublicStripeSettings | null;
  assessmentId?: string | null;
  clientToken?: string | null;
}

export function ResultView({
  completeResult,
  reportText,
  userFirstName,
  reportLoading = false,
  reportError = null,
  stripeSettings = null,
  assessmentId = null,
  clientToken = null,
}: ResultViewProps) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function handleBuyNow() {
    if (!assessmentId || !clientToken) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, clientToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        console.error('Checkout error:', data?.error ?? 'Unknown error');
        setCheckoutLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutLoading(false);
    }
  }

  const displayName = userFirstName || 'There';
  const reportRaw = reportText?.trim() ?? '';
  const firstLine = reportRaw.split(/\n/)[0]?.trim() ?? '';
  const archetypeMatch = firstLine.includes(' — ') ? firstLine.split(' — ').slice(1).join(' — ') : '';
  const archetype = archetypeMatch || 'Your unique profile';
  const reportParagraphs =
    reportRaw !== ''
      ? reportRaw.split(/\n\n+/).filter((p) => p.trim().length > 0)
      : [];
  const iqPct = completeResult.iqPercentile;
  const iqPercentileDisplay =
    typeof iqPct === 'number'
      ? `${iqPct}${iqPct % 10 === 1 && iqPct !== 11 ? 'st' : iqPct % 10 === 2 && iqPct !== 12 ? 'nd' : iqPct % 10 === 3 && iqPct !== 13 ? 'rd' : 'th'} percentile`
      : String(iqPct ?? '—');

  const axisEntries = getAxisDisplayEntries(completeResult.mbti, completeResult.axisStrengths ?? {});
  const sabotageProfile = getSabotageProfile(completeResult.selfSabotageScores ?? {});
  const envDisplay = getEnvDisplay(completeResult.optimalEnvScores ?? {});
  const cognitiveTier = getCognitiveTier(iqPct);
  const cognitiveRange = getCognitiveRange(iqPct);
  const primarySabotage = sabotageProfile[0];
  const secondarySabotage = sabotageProfile[1];
  const envSummary =
    envDisplay.length > 0 ? envDisplay.map((e) => `${e.name}: ${e.label}`).join(', ') : '—';

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 h-14 bg-[#4c1d95] text-white shrink-0">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-8 w-auto object-contain" />
          <span className="font-semibold text-white">TalentRank</span>
        </div>
        <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 font-medium rounded-lg" asChild>
          <a href="#report">Reveal My TalentRank</a>
        </Button>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-10 sm:gap-14 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="text-center text-sm text-muted-foreground">
          If your report doesn&apos;t display immediately, refresh this page.
        </p>

        <section className="space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center tracking-tight">
            Your TalentRank Profile
          </h1>
          <p className="text-center text-muted-foreground">
            The rare mix of traits that sets you apart from everyone else.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border border-border/80 bg-card shadow-sm">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-foreground shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xl font-semibold text-foreground">{displayName}</p>
              <p className="text-muted-foreground mt-1">
                {completeResult.mbti} · {cognitiveTier}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">1. TalentRank Type</h2>
            <p className="text-foreground font-medium">Type: {completeResult.mbti}</p>
            <p className="text-sm text-muted-foreground">Cognitive Tier: {cognitiveTier}</p>
            {primarySabotage && (
              <p className="text-sm text-muted-foreground">Primary Sabotage Pattern: {primarySabotage.name}</p>
            )}
            <p className="text-sm text-muted-foreground">Optimal Environment: {envSummary}</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">2. Axis Strengths</h2>
            <ul className="space-y-1 text-sm text-foreground">
              {axisEntries.map(({ letter, pct, label }) => (
                <li key={letter}>
                  {letter}: {pct}% ({label})
                </li>
              ))}
            </ul>
          </div>

          {(primarySabotage || secondarySabotage) && (
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">3. Sabotage Profile</h2>
              {primarySabotage && (
                <p className="text-sm text-foreground">
                  Primary: {primarySabotage.name} ({primarySabotage.scoreOutOf5}/5)
                </p>
              )}
              {secondarySabotage && (
                <p className="text-sm text-muted-foreground">
                  Secondary: {secondarySabotage.name} ({secondarySabotage.scoreOutOf5}/5)
                </p>
              )}
            </div>
          )}

          {envDisplay.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">4. Environment Fit</h2>
              <ul className="space-y-1 text-sm text-foreground">
                {envDisplay.map((e) => (
                  <li key={e.name}>
                    {e.name}: {e.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">5. Cognitive Estimate</h2>
            <p className="text-sm text-foreground">Estimated Range: {cognitiveRange}</p>
            <p className="text-sm text-muted-foreground">Percentile: {cognitiveTier}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>🧠</span>
                <span className="font-semibold text-foreground">{completeResult.mbti}</span>
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Type Explained</p>
              <p className="text-sm text-foreground leading-relaxed">{getMbtiBlurb(completeResult.mbti)}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>⚡</span>
                <span className="font-semibold text-foreground">{cognitiveRange}</span>
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your IQ</p>
              <p className="text-sm text-foreground leading-relaxed">{getCognitiveBlurb(iqPct)}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>📈</span>
                <span className="font-semibold text-foreground">{iqPercentileDisplay}</span>
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IQ Percentile Description</p>
              <p className="text-sm text-foreground leading-relaxed">{getPercentileRoomBlurb(iqPct)}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>📜</span>
                <span className="font-semibold text-foreground">{archetype}</span>
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Archetype Blurb</p>
              <p className="text-sm text-foreground leading-relaxed">
                {reportParagraphs[0]?.slice(0, 160) ?? 'Your unique cognitive fingerprint, decoded from your responses.'}
                {reportParagraphs[0] && reportParagraphs[0].length > 160 ? '…' : ''}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-[#4c1d95] text-white p-6 sm:p-8 text-center">
          <p className="text-lg sm:text-xl font-semibold">
            Join 2,847+ high achievers who&apos;ve unlocked their cognitive blueprint.
          </p>
          <p className="mt-2 flex items-center justify-center gap-1 text-sm text-white/90">
            <span aria-hidden>★★★★★</span> &quot;Something literally everyone should know about themselves&quot; — Sarah M.
          </p>
        </section>

        <section id="report" className="space-y-6 scroll-mt-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">TalentRank Report</h2>
          {reportLoading && <p className="text-sm text-muted-foreground py-8">Generating your report… We&apos;ll email you when it&apos;s ready.</p>}
          {reportError && <p className="text-sm text-destructive py-4">{reportError}</p>}
          {reportParagraphs.length > 0 && !reportLoading && (
            <>
              <p className="text-sm text-muted-foreground mb-4">We&apos;ve sent your report to your email.</p>
              {firstLine && (
                <p className="text-xl sm:text-2xl font-semibold text-foreground text-center">
                  {displayName} — {archetype}
                </p>
              )}
              <article className="space-y-6 max-w-[65ch] mx-auto">
                {reportParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-[15px] sm:text-base text-foreground leading-relaxed">
                    {paragraph.trim()}
                  </p>
                ))}
              </article>
            </>
          )}
        </section>

        {stripeSettings?.enabled ? (
          <section className="rounded-xl bg-gradient-to-br from-[#4c1d95] to-[#6d28d9] text-white p-6 sm:p-8 space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">
                {stripeSettings.productName || 'Unlock Your Career Growth'}
              </h2>
              <p className="text-white/80 text-sm max-w-xl">
                {stripeSettings.productDescription || 'Invest in an advanced report that shows your blockers, traits, and habits that may be holding you back — and get a detailed plan to fix them and succeed in your career.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {stripeSettings.priceDisplay && (
                <span className="text-3xl font-bold">{stripeSettings.priceDisplay}</span>
              )}
              <Button
                size="lg"
                onClick={handleBuyNow}
                disabled={checkoutLoading || !assessmentId || !clientToken}
                className="w-full sm:w-auto min-w-[180px] h-12 font-medium rounded-lg bg-white text-[#4c1d95] hover:bg-white/90 border-0"
              >
                {checkoutLoading ? 'Redirecting…' : 'Buy Now →'}
              </Button>
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 text-center space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Unlock Your Career Growth</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Invest in an advanced report that shows your blockers, traits, and habits that may be holding you back — and get a detailed plan to fix them and succeed in your career.
            </p>
            <Button
              size="lg"
              onClick={handleBuyNow}
              disabled={checkoutLoading || !assessmentId || !clientToken}
              className="w-full sm:w-auto min-w-[180px] h-12 font-medium rounded-lg bg-[#4c1d95] hover:bg-[#5b21b6] text-white"
            >
              {checkoutLoading ? 'Redirecting…' : 'Buy Now'}
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}

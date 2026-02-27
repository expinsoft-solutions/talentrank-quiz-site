'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getVslConfig } from '@/lib/site-settings';
import { SiteHeader } from '@/components/SiteHeader';

const PENDING_KEY = 'talentrank_pending_submit';

const YT_ENDED = 0;

function isYoutubeEmbed(url: string): boolean {
  return /youtube\.com\/embed\/|youtu\.be\//i.test(url);
}

function buildEmbedSrc(url: string): string {
  const u = new URL(url.startsWith('http') ? url : `https://${url}`);
  u.searchParams.set('autoplay', '1');
  u.searchParams.set('mute', '1');
  if (u.hostname.includes('youtube') || u.hostname.includes('youtu.be')) {
    u.searchParams.set('controls', '0');
    u.searchParams.set('rel', '0');
    u.searchParams.set('modestbranding', '1');
    u.searchParams.set('enablejsapi', '1');
    if (typeof window !== 'undefined') {
      u.searchParams.set('origin', window.location.origin);
    }
  }
  return u.toString();
}

declare global {
  interface Window {
    YT?: { Player: new (el: string | HTMLElement, opts: { videoId?: string; events?: { onStateChange?: (e: { data: number }) => void } }) => { destroy: () => void } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function VslContent() {
  const searchParams = useSearchParams();
  const urlAssessmentId = searchParams.get('assessmentId') ?? searchParams.get('assessment_id');
  const urlClientToken = searchParams.get('clientToken') ?? searchParams.get('client_token');
  const [ids, setIds] = useState<{ assessmentId: string; clientToken: string } | null>(() =>
    urlAssessmentId && urlClientToken ? { assessmentId: urlAssessmentId, clientToken: urlClientToken } : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reportReady, setReportReady] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [videoComplete, setVideoComplete] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ destroy: () => void } | null>(null);
  const pendingHandledRef = useRef(false);
  const reportCheckDoneRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const assessmentId = ids?.assessmentId ?? urlAssessmentId;
  const clientToken = ids?.clientToken ?? urlClientToken;

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const timerStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:00`;

  useEffect(() => {
    if (pendingHandledRef.current) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(PENDING_KEY);
    } catch {
      //
    }
    if (!raw) return;
    pendingHandledRef.current = true;
    let payload: { token: string; responses: Array<{ questionId: string; answerNumeric?: number | null; answerRaw?: string | null }> };
    try {
      payload = JSON.parse(raw);
    } catch {
      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch {
        //
      }
      return;
    }
    if (typeof payload?.token !== 'string' || !Array.isArray(payload?.responses)) {
      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch {
        //
      }
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    fetch('/api/submit-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: payload.token, responses: payload.responses }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        try {
          sessionStorage.removeItem(PENDING_KEY);
        } catch {
          //
        }
        if (!res.ok) {
          setSubmitError(typeof data?.error === 'string' ? data.error : 'Failed to save');
          setSubmitting(false);
          return;
        }
        if (typeof data?.assessmentId === 'string' && typeof data?.clientToken === 'string') {
          setIds({ assessmentId: data.assessmentId, clientToken: data.clientToken });
          const params = new URLSearchParams({
            assessmentId: data.assessmentId,
            clientToken: data.clientToken,
          });
          window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
          fetch('/api/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assessmentId: data.assessmentId, clientToken: data.clientToken }),
          })
            .then((r) => r.json().catch(() => ({})))
            .then((d) => {
              if (d?.error === 'Report generation not configured' || (typeof d?.reportText === 'string' && d.reportText?.trim())) {
                setReportReady(true);
              }
            })
            .catch(() => {});
          const aid = data.assessmentId;
          const ctk = data.clientToken;
          const POLL_MS = 4500;
          const MAX = 60;
          let n = 0;
          const stop = () => {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          };
          const poll = () => {
            n += 1;
            if (n > MAX) {
              stop();
              return;
            }
            fetch('/api/get-assessment-result', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ assessmentId: aid, clientToken: ctk }),
            })
              .then((r) => r.json().catch(() => ({})))
              .then((d) => {
                if (typeof d?.reportText === 'string' && d.reportText.trim()) {
                  stop();
                  setReportReady(true);
                }
              });
          };
          pollIntervalRef.current = setInterval(poll, POLL_MS);
          poll();
        }
        setSubmitting(false);
      })
      .catch(() => {
        try {
          sessionStorage.removeItem(PENDING_KEY);
        } catch {
          //
        }
        setSubmitError('Network error');
        setSubmitting(false);
      });
  }, []);

  useEffect(() => {
    getVslConfig().then((c) => {
      if (c.vsl_embed_url?.trim()) setEmbedUrl(c.vsl_embed_url.trim());
    });
  }, []);

  useEffect(() => {
    if (!urlAssessmentId || !urlClientToken || !assessmentId || !clientToken || reportCheckDoneRef.current) return;
    reportCheckDoneRef.current = true;
    fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId, clientToken }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (data?.error === 'Report generation not configured' || (typeof data?.reportText === 'string' && data.reportText?.trim())) {
          setReportReady(true);
        }
      })
      .catch(() => {});
    const POLL_MS = 4500;
    const MAX = 60;
    let n = 0;
    const stop = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    const poll = () => {
      n += 1;
      if (n > MAX) {
        stop();
        return;
      }
      fetch('/api/get-assessment-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, clientToken }),
      })
        .then((r) => r.json().catch(() => ({})))
        .then((data) => {
          if (typeof data?.reportText === 'string' && data.reportText.trim()) {
            stop();
            setReportReady(true);
          }
        });
    };
    pollIntervalRef.current = setInterval(poll, POLL_MS);
    poll();
    return () => stop();
  }, [urlAssessmentId, urlClientToken, assessmentId, clientToken]);

  useEffect(() => {
    if (!embedUrl || !isYoutubeEmbed(embedUrl)) return;
    const videoIdMatch = embedUrl.match(/(?:embed\/|v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    const videoId = videoIdMatch?.[1];
    if (!videoId || !containerRef.current) return;

    function initPlayer() {
      if (!containerRef.current || !window.YT) return;
      const div = document.createElement('div');
      div.id = 'yt-player';
      div.className = 'w-full h-full';
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(div);
      playerRef.current = new window.YT!.Player('yt-player', {
        videoId,
        // @ts-expect-error playerVars is valid YouTube API but types are incomplete
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
        },
        events: {
          onStateChange(e: { data: number }) {
            if (e.data === YT_ENDED) setVideoComplete(true);
          },
        },
      });
    }

    if (window.YT?.Player) {
      initPlayer();
      return () => {
        playerRef.current?.destroy();
        playerRef.current = null;
      };
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(tag, firstScript);
    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      delete window.onYouTubeIframeAPIReady;
    };
  }, [embedUrl]);

  useEffect(() => {
    if (reportReady && assessmentId && clientToken) {
      window.location.href = `/assessment/result?assessmentId=${encodeURIComponent(assessmentId)}&clientToken=${encodeURIComponent(clientToken)}`;
    }
  }, [reportReady, assessmentId, clientToken]);

  const resultHref =
    assessmentId && clientToken
      ? `/assessment/result?assessmentId=${encodeURIComponent(assessmentId)}&clientToken=${encodeURIComponent(clientToken)}`
      : '/';

  const canProceed =
    Boolean(assessmentId && clientToken && reportReady) &&
    (!embedUrl || videoComplete || !isYoutubeEmbed(embedUrl ?? ''));

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <SiteHeader
        rightAction={
          <Button
            size="sm"
            className="rounded-lg bg-[#4c1d95] hover:bg-[#5b21b6] text-white font-medium"
            asChild
          >
            <Link href="/">Reveal My TalentRank</Link>
          </Button>
        }
      />

      <main className="flex-1 w-full flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-2">
          Your Custom Report Is Being Generated...
        </h1>
        <p className="text-center text-muted-foreground text-sm sm:text-base max-w-xl mb-8">
          Your AI Analysis takes 3-5 minutes to complete. While it processes, watch this explanation of what makes your assessment different from every personality test you&apos;ve taken.
        </p>

        <div className="w-full max-w-4xl mx-auto relative aspect-video bg-black rounded-xl overflow-hidden shadow-xl">
          {embedUrl && (
            <>
              {isYoutubeEmbed(embedUrl) ? (
                <div ref={containerRef} className="absolute inset-0 w-full h-full" />
              ) : (
                <iframe
                  src={buildEmbedSrc(embedUrl)}
                  title="VSL"
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-1">
                <p className="text-white/70 text-xs font-mono tabular-nums">{timerStr}</p>
                <p className="text-white/95 text-sm sm:text-base font-medium">
                  {submitting ? 'Submitting your answers…' : 'Your results are being processed right now.'}
                </p>
              </div>
            </>
          )}
          {!embedUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <p className="text-muted-foreground text-sm">Loading video...</p>
            </div>
          )}
        </div>

        <div className="w-full max-w-xl mx-auto mt-8 sm:mt-10 space-y-4 text-center">
          <div className="flex justify-center gap-0.5 text-amber-500" aria-hidden>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="text-lg sm:text-xl">★</span>
            ))}
          </div>
          <blockquote className="text-muted-foreground text-sm sm:text-base italic">
            &quot;Something literally everyone should know about themselves&quot; — Sarah M.
          </blockquote>
          <p className="text-destructive text-sm sm:text-base font-medium">
            Your results are being generated.
          </p>
          {submitError && (
            <p className="text-destructive text-sm font-medium">{submitError}</p>
          )}
        </div>

        <div className="mt-10">
          {canProceed ? (
            <Button
              size="lg"
              className="min-w-[200px] h-12 font-medium rounded-lg bg-[#4c1d95] hover:bg-[#5b21b6] text-white"
              asChild
            >
              <Link href={resultHref}>See my results</Link>
            </Button>
          ) : (
            <Button
              size="lg"
              className="min-w-[200px] h-12 font-medium rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
              disabled
            >
              {assessmentId && clientToken && !reportReady ? 'Report generating…' : 'See my results'}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VslPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>}>
      <VslContent />
    </Suspense>
  );
}

'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getVslConfig } from '@/lib/site-settings';

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
  const assessmentId = searchParams.get('assessmentId');
  const clientToken = searchParams.get('clientToken');
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [videoComplete, setVideoComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    getVslConfig().then((c) => {
      if (c.vsl_embed_url?.trim()) setEmbedUrl(c.vsl_embed_url.trim());
    });
  }, []);

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

  const resultHref =
    assessmentId && clientToken
      ? `/assessment/result?assessmentId=${encodeURIComponent(assessmentId)}&clientToken=${encodeURIComponent(clientToken)}`
      : '/';

  const canProceed = !embedUrl || videoComplete || !isYoutubeEmbed(embedUrl ?? '');

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 h-14 bg-[#4c1d95] text-white shrink-0">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-8 w-auto object-contain" />
          <span className="font-semibold text-white">TalentRank</span>
        </div>
      </header>
      <main className="flex-1 w-full flex flex-col">
        {embedUrl && (
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 aspect-video bg-black">
            {isYoutubeEmbed(embedUrl) ? (
              <div ref={containerRef} className="w-full h-full" />
            ) : (
              <iframe
                src={buildEmbedSrc(embedUrl)}
                title="VSL"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        )}
        <div className="flex flex-col items-center gap-4 px-4 sm:px-6 py-8 max-w-md mx-auto w-full">
          {!canProceed && (
            <p className="text-center text-muted-foreground text-sm">
              Your results are being processed.
            </p>
          )}
          {canProceed ? (
            <Button size="lg" className="min-w-[200px] h-12 font-medium rounded-lg bg-[#4c1d95] hover:bg-[#5b21b6] text-white" asChild>
              <Link href={resultHref}>See my results</Link>
            </Button>
          ) : (
            <Button size="lg" className="min-w-[200px] h-12 font-medium rounded-lg bg-muted text-muted-foreground cursor-not-allowed" disabled>
              See my results
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

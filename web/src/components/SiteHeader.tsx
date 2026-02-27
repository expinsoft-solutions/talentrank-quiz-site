'use client';

import type { ReactNode } from 'react';

interface SiteHeaderProps {
  rightAction: ReactNode;
  variant?: 'default' | 'purple';
}

export function SiteHeader({ rightAction, variant = 'default' }: SiteHeaderProps) {
  const isPurple = variant === 'purple';
  return (
    <header
      className={
        isPurple
          ? 'sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 h-14 bg-[#4c1d95] text-white shrink-0'
          : 'sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'
      }
    >
      <div
        className={
          isPurple
            ? 'flex flex-1 items-center justify-between gap-2'
            : 'container flex h-14 items-center justify-between px-4 sm:px-6'
        }
      >
        <img src="/logo.png" alt="TalentRank" className="h-8 w-auto object-contain" />
        {rightAction}
      </div>
    </header>
  );
}

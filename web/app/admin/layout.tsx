'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { FileQuestion, LayoutList, LogOut, Settings, Sparkles, Video } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminOk, setAdminOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    fetch('/api/admin/me')
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          setAdminOk(false);
        } else {
          return res.json().then((d) => setAdminOk(d.isAdmin === true));
        }
      })
      .catch(() => setAdminOk(false));
  }, [pathname]);

  useEffect(() => {
    if (adminOk === false) {
      router.replace('/admin/login');
    }
  }, [adminOk, router]);

  if (pathname === '/admin/login') {
    return children;
  }

  if (adminOk === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-pulse text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <aside className="w-56 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <Link href="/admin" className="text-lg font-semibold text-slate-900 dark:text-white">
            TalentRank Admin
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <Link
            href="/admin/questions"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/admin/questions'
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            Questions
          </Link>
          <Link
            href="/admin/submissions"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith('/admin/submissions')
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutList className="w-4 h-4" />
            Submissions
          </Link>
          <Link
            href="/admin/prompt"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/admin/prompt'
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI settings
          </Link>
          <Link
            href="/admin/vsl"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/admin/vsl'
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Video className="w-4 h-4" />
            VSL
          </Link>
          <Link
            href="/admin/settings"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/admin/settings'
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </nav>
        <div className="p-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-slate-600 dark:text-slate-400"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push('/admin/login');
              router.refresh();
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

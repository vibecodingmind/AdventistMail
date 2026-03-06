'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { MailboxSelector } from '@/components/MailboxSelector';
import { SearchBar } from '@/components/SearchBar';
import { ComposeButton } from '@/components/ComposeButton';

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mailbox = searchParams.get('mailbox') || undefined;

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between gap-4 px-6 bg-white border-b border-slate-200 shrink-0">
          <MailboxSelector />
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <SearchBar />
            <ComposeButton mailbox={mailbox} />
          </div>
        </header>
        <main className="flex-1 flex overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

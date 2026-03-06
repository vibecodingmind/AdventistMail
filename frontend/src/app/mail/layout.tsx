'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { MailboxSelector } from '@/components/MailboxSelector';
import { SearchBar } from '@/components/SearchBar';

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center gap-4 px-4 border-b border-gray-200">
          <MailboxSelector />
          <SearchBar />
        </header>
        <main className="flex-1 flex overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

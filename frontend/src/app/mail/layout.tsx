'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { IconNavBar } from '@/components/IconNavBar';

export default function MailLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/login');
  }, [router]);

  return (
    <div className="h-screen bg-[#ECEDF5] flex items-center justify-center p-4 font-sans">
      <div className="flex h-full w-full rounded-2xl overflow-hidden shadow-xl bg-white">
        <IconNavBar />
        <Sidebar />
        <main className="flex-1 flex overflow-hidden min-w-0 bg-[#F5F6FA]">
          {children}
        </main>
      </div>
    </div>
  );
}

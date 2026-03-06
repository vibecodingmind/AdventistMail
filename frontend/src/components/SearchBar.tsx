'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const mailbox = searchParams.get('mailbox');
      const params = new URLSearchParams({ q: query.trim(), folder: 'inbox' });
      if (mailbox) params.set('mailbox', mailbox);
      await api<{ messages: unknown[] }>(`/mail/search?${params}`);
      router.push(`/mail/search?q=${encodeURIComponent(query)}&mailbox=${mailbox || ''}`);
    } catch {
      // Stay on page
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex-1">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search something..."
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border-0 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-colors"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">⌘S</span>
      </div>
    </form>
  );
}

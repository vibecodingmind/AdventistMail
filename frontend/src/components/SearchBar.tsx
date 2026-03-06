'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const mailbox = searchParams.get('mailbox');
      const params = new URLSearchParams({ q: query.trim(), folder: 'inbox' });
      if (mailbox) params.set('mailbox', mailbox);
      const res = await api<{ messages: unknown[] }>(`/mail/search?${params}`);
      router.push(`/mail/search?q=${encodeURIComponent(query)}&mailbox=${mailbox || ''}`);
    } catch {
      // Stay on page
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex-1 max-w-xl">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search mail"
        className="w-full px-4 py-2 border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </form>
  );
}

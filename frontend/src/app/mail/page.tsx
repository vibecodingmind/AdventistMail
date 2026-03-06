'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageList } from '@/components/MessageList';
import { MessageView } from '@/components/MessageView';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface Message {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  flags: string[];
}

export default function MailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mailbox = searchParams.get('mailbox') || undefined;
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ['messages', 'inbox', mailbox],
    queryFn: () => {
      const params = new URLSearchParams({ folder: 'inbox' });
      if (mailbox) params.set('mailbox', mailbox);
      return api<{ messages: Message[] }>(`/mail/messages?${params}`);
    },
  });

  const messages = data?.messages ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) router.push(`/mail/search?q=${encodeURIComponent(search.trim())}`);
  }

  const onArchive = async () => {
    if (!selectedUid) return;
    try {
      await api('/mail/bulk/move', { method: 'POST', body: JSON.stringify({ folder: 'inbox', uids: [selectedUid], destFolder: 'Sent', mailbox }) });
      toast.success('Archived');
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox', mailbox] });
      setSelectedUid(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const onDelete = async () => {
    if (!selectedUid) return;
    try {
      await api('/mail/bulk/move', { method: 'POST', body: JSON.stringify({ folder: 'inbox', uids: [selectedUid], destFolder: 'Trash', mailbox }) });
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox', mailbox] });
      setSelectedUid(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  useKeyboardShortcuts({
    folder: 'inbox',
    messages,
    selectedUid,
    onSelect: setSelectedUid,
    onArchive,
    onDelete,
    searchRef: searchInputRef,
    enabled: messages.length > 0,
  });

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {/* ── Email list column ── */}
      <div className="w-[300px] flex flex-col shrink-0 bg-white border-r border-slate-100">
        {/* Search */}
        <div className="px-4 py-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search (press / to focus)"
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-300 transition-all"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>

        <MessageList
          messages={messages}
          selectedUid={selectedUid}
          onSelect={setSelectedUid}
          folder="inbox"
          mailbox={mailbox}
        />
      </div>

      {/* ── Email view ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
        {selectedUid ? (
          <MessageView
            uid={selectedUid}
            folder="inbox"
            mailbox={mailbox}
            allMessages={messages}
          />
        ) : (
          <div className="flex items-center justify-center h-full select-none">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-slate-400 font-medium">Select a message to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

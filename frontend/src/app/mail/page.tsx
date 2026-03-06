'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageList } from '@/components/MessageList';
import { MessageView } from '@/components/MessageView';
import { AgendaPanel } from '@/components/AgendaPanel';

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
  const mailbox = searchParams.get('mailbox') || undefined;
  const [selectedUid, setSelectedUid] = useState<number | null>(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['messages', 'inbox', mailbox],
    queryFn: () => {
      const params = new URLSearchParams({ folder: 'inbox' });
      if (mailbox) params.set('mailbox', mailbox);
      return api<{ messages: Message[] }>(`/mail/messages?${params}`);
    },
  });

  const messages = data?.messages ?? [];
  const totalCount = messages.length;
  const unreadCount = messages.filter((m) => !m.flags.includes('\\Seen')).length;

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {/* ── Email list column ── */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        {/* Sort / Select bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span>Sorted by:</span>
            <button className="flex items-center gap-0.5 font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Received
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {unreadCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-xs font-semibold">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
              Select
            </button>
            <button
              onClick={() => refetch()}
              className={`p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isFetching ? 'animate-spin' : ''}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Inbox count label */}
        {totalCount > 0 && (
          <div className="px-3 py-1 text-xs text-slate-400 dark:text-slate-600 border-b border-slate-50 dark:border-slate-800/50">
            Inbox ({unreadCount} / {totalCount})
          </div>
        )}

        <MessageList
          messages={messages}
          selectedUid={selectedUid}
          onSelect={setSelectedUid}
          folder="inbox"
          mailbox={mailbox}
        />
      </div>

      {/* ── Email view ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white dark:bg-slate-900">
        {selectedUid ? (
          <MessageView
            uid={selectedUid}
            folder="inbox"
            mailbox={mailbox}
            total={totalCount}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300 dark:text-slate-700 text-sm select-none">
            <div className="text-center space-y-3">
              <svg className="w-14 h-14 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-400 dark:text-slate-600">Select a message to read</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Agenda ── */}
      <AgendaPanel />
    </div>
  );
}

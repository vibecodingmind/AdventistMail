'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageList } from '@/components/MessageList';
import { MessageView } from '@/components/MessageView';

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

  const { data } = useQuery({
    queryKey: ['messages', 'inbox', mailbox],
    queryFn: () => {
      const params = new URLSearchParams({ folder: 'inbox' });
      if (mailbox) params.set('mailbox', mailbox);
      return api<{ messages: Message[] }>(`/mail/messages?${params}`);
    },
  });

  const messages = data?.messages ?? [];

  return (
    <div className="flex flex-1 min-w-0 bg-white dark:bg-slate-900">
      {/* Email list */}
      <div className="w-[400px] border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Inbox</h1>
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            {['All', 'Unread', 'Starred'].map((tab) => (
              <button
                key={tab}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap"
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <MessageList
          messages={messages}
          selectedUid={selectedUid}
          onSelect={(uid) => setSelectedUid(uid)}
          folder="inbox"
          mailbox={mailbox}
        />
      </div>
      {/* Message view */}
      <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50">
        {selectedUid ? (
          <MessageView
            uid={selectedUid}
            folder="inbox"
            mailbox={mailbox}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">
            Select a message
          </div>
        )}
      </div>
      {/* Right sidebar - Today's events placeholder */}
      <aside className="w-72 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 hidden xl:block">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Today&apos;s Calendar
            </h2>
          </div>
        </div>
        <div className="p-4 text-slate-500 dark:text-slate-400 text-sm">
          <p>No events scheduled</p>
          <p className="mt-2 text-xs">Calendar integration coming soon.</p>
        </div>
      </aside>
    </div>
  );
}

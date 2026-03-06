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

interface MailFolderLayoutProps {
  folder: string;
  title: string;
}

export function MailFolderLayout({ folder, title }: MailFolderLayoutProps) {
  const searchParams = useSearchParams();
  const mailbox = searchParams.get('mailbox') || undefined;
  const [selectedUid, setSelectedUid] = useState<number | null>(null);

  const { data } = useQuery({
    queryKey: ['messages', folder, mailbox],
    queryFn: () => {
      const params = new URLSearchParams({ folder });
      if (mailbox) params.set('mailbox', mailbox);
      return api<{ messages: Message[] }>(`/mail/messages?${params}`);
    },
  });

  const messages = data?.messages ?? [];

  return (
    <div className="flex flex-1 min-w-0 bg-white dark:bg-slate-900">
      <div className="w-[400px] border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">{title}</h1>
        </div>
        <MessageList
          messages={messages}
          selectedUid={selectedUid}
          onSelect={(uid) => setSelectedUid(uid)}
          folder={folder}
          mailbox={mailbox}
        />
      </div>
      <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50">
        {selectedUid ? (
          <MessageView uid={selectedUid} folder={folder} mailbox={mailbox} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">
            Select a message
          </div>
        )}
      </div>
      <aside className="w-72 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 hidden xl:block">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Today&apos;s Calendar
          </h2>
        </div>
        <div className="p-4 text-slate-500 dark:text-slate-400 text-sm">
          <p>No events scheduled</p>
        </div>
      </aside>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageList } from '@/components/MessageList';
import { ThreadList } from '@/components/ThreadList';
import { MessageView } from '@/components/MessageView';
import { ThreadView } from '@/components/ThreadView';
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

interface Thread {
  threadId: string;
  messages: Message[];
  latestDate: string;
  subject: string;
  participants: string[];
  snippet: string;
  unreadCount: number;
}

function getConversationViewSetting(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem('mail_settings');
    if (saved) {
      const s = JSON.parse(saved);
      if (s.conversationView !== undefined) return s.conversationView;
    }
  } catch {}
  return true;
}

export default function MailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mailbox = searchParams.get('mailbox') || undefined;
  const folder = searchParams.get('folder') || 'inbox';
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [conversationView, setConversationView] = useState(true);

  useEffect(() => {
    setConversationView(getConversationViewSetting());
  }, []);

  useEffect(() => {
    setSelectedUid(null);
    setSelectedThreadId(null);
  }, [folder, mailbox]);

  const { data } = useQuery({
    queryKey: ['messages', folder, mailbox],
    queryFn: () => {
      const params = new URLSearchParams({ folder });
      if (mailbox) params.set('mailbox', mailbox);
      return api<{ messages: Message[] }>(`/mail/messages?${params}`);
    },
    enabled: !conversationView,
  });

  const { data: threadData } = useQuery({
    queryKey: ['threads', folder, mailbox],
    queryFn: () => {
      const params = new URLSearchParams({ folder });
      if (mailbox) params.set('mailbox', mailbox);
      return api<{ threads: Thread[] }>(`/mail/threads?${params}`);
    },
    enabled: conversationView,
  });

  const messages = data?.messages ?? [];
  const threads = threadData?.threads ?? [];

  const selectedThread = threads.find((t) => t.threadId === selectedThreadId);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) router.push(`/mail/search?q=${encodeURIComponent(search.trim())}`);
  }

  const onArchive = async () => {
    if (!selectedUid) return;
    try {
      await api('/mail/bulk/move', { method: 'POST', body: JSON.stringify({ folder, uids: [selectedUid], destFolder: 'Sent', mailbox }) });
      toast.success('Archived');
      queryClient.invalidateQueries({ queryKey: ['messages', folder, mailbox] });
      queryClient.invalidateQueries({ queryKey: ['threads', folder, mailbox] });
      setSelectedUid(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const onDelete = async () => {
    if (!selectedUid) return;
    try {
      await api('/mail/bulk/move', { method: 'POST', body: JSON.stringify({ folder, uids: [selectedUid], destFolder: 'Trash', mailbox }) });
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['messages', folder, mailbox] });
      queryClient.invalidateQueries({ queryKey: ['threads', folder, mailbox] });
      setSelectedUid(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  useKeyboardShortcuts({
    folder,
    messages,
    selectedUid,
    onSelect: setSelectedUid,
    onArchive,
    onDelete,
    searchRef: searchInputRef,
    enabled: !conversationView && messages.length > 0,
  });

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {/* Email list column */}
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

        {conversationView ? (
          <ThreadList
            threads={threads}
            selectedThreadId={selectedThreadId}
            onSelect={setSelectedThreadId}
            folder={folder}
            mailbox={mailbox}
          />
        ) : (
          <MessageList
            messages={messages}
            selectedUid={selectedUid}
            onSelect={setSelectedUid}
            folder={folder}
            mailbox={mailbox}
          />
        )}
      </div>

      {/* Email view */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
        {conversationView && selectedThread ? (
          <ThreadView
            thread={selectedThread}
            folder={folder}
            mailbox={mailbox}
          />
        ) : !conversationView && selectedUid ? (
          <MessageView
            uid={selectedUid}
            folder={folder}
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
              <p className="text-sm text-slate-400 font-medium">
                {conversationView ? 'Select a conversation to read' : 'Select a message to read'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

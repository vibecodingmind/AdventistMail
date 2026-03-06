'use client';

import clsx from 'clsx';

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

interface ThreadListProps {
  threads: Thread[];
  selectedThreadId: string | null;
  onSelect: (threadId: string) => void;
  folder: string;
  mailbox?: string;
}

const avatarPalette = [
  'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-sky-400',
  'bg-violet-400', 'bg-pink-400', 'bg-teal-400', 'bg-orange-400',
  'bg-indigo-400', 'bg-cyan-400',
];

function getColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h += str.charCodeAt(i);
  return avatarPalette[h % avatarPalette.length];
}

function getInitials(str: string): string {
  const parts = str.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return str.slice(0, 2).toUpperCase() || '?';
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isSameDay = d.toDateString() === now.toDateString();
  if (isSameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString([], { day: 'numeric', month: '2-digit' });
}

export function ThreadList({ threads, selectedThreadId, onSelect }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-12">
        No conversations
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {threads.map((thread) => {
          const firstParticipant = thread.participants[0] || 'Unknown';
          const initials = getInitials(firstParticipant);
          const color = getColor(firstParticipant);
          const isSelected = selectedThreadId === thread.threadId;
          const hasUnread = thread.unreadCount > 0;
          const msgCount = thread.messages.length;

          return (
            <button
              key={thread.threadId}
              onClick={() => onSelect(thread.threadId)}
              className={clsx(
                'w-full text-left px-3 py-3.5 rounded-xl transition-all flex items-start gap-3',
                isSelected
                  ? 'bg-white shadow-sm shadow-slate-200/80 border border-slate-100'
                  : 'hover:bg-slate-50'
              )}
            >
              <div className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-white',
                color
              )}>
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={clsx(
                      'text-sm leading-tight truncate',
                      hasUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                    )}>
                      {thread.participants.join(', ')}
                    </span>
                    {msgCount > 1 && (
                      <span className="text-xs text-slate-400 shrink-0">({msgCount})</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 leading-tight">{formatTime(thread.latestDate)}</span>
                </div>
                <p className={clsx(
                  'text-xs truncate leading-relaxed',
                  hasUnread ? 'text-slate-700 font-medium' : 'text-slate-500'
                )}>
                  {thread.subject}
                </p>
                {thread.unreadCount > 0 && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full min-w-[18px]">
                      {thread.unreadCount}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

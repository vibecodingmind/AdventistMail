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

interface MessageListProps {
  messages: Message[];
  selectedUid: number | null;
  onSelect: (uid: number) => void;
  folder: string;
  mailbox?: string;
}

function getInitials(str: string): string {
  const parts = str.replace(/<[^>]+>/g, '').trim().split(/[\s@]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return str.slice(0, 2).toUpperCase() || '?';
}

function getAvatarColor(str: string): string {
  const colors = [
    'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500',
    'bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-rose-500',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return colors[hash % colors.length];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 24 * 60 * 60 * 1000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diff < 48 * 60 * 60 * 1000) return 'Yesterday';
  if (diff < 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2] };
  return { name: from, email: from };
}

export function MessageList({ messages, selectedUid, onSelect, folder, mailbox }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">No messages</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {messages.map((msg) => {
            const { name } = parseFrom(msg.from);
            const initials = getInitials(msg.from);
            const color = getAvatarColor(msg.from);
            return (
              <button
                key={msg.uid}
                onClick={() => onSelect(msg.uid)}
                className={clsx(
                  'w-full text-left p-4 hover:bg-slate-50/80 transition-colors',
                  selectedUid === msg.uid && 'bg-indigo-50/80'
                )}
              >
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0',
                    color
                  )}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 items-start">
                      <div className="min-w-0">
                        <span className="font-medium text-slate-900 truncate block tracking-tight">{name}</span>
                        <span className="text-slate-600 truncate block text-sm">• {msg.subject}</span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                        {formatTime(msg.date)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate mt-1">
                      {msg.subject}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

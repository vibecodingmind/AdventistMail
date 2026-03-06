'use client';

import { useState } from 'react';
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
  const clean = str.replace(/<[^>]+>/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase() || '?';
}

const avatarPalette = [
  'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500',
  'bg-violet-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500',
  'bg-indigo-500', 'bg-cyan-500',
];
function getColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h += str.charCodeAt(i);
  return avatarPalette[h % avatarPalette.length];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isSameDay = d.toDateString() === now.toDateString();
  if (isSameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function parseFrom(from: string): string {
  const match = from.match(/^(.+?)\s*</);
  return match ? match[1].trim() : from.split('@')[0];
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function GroupHeader({ label, open, onToggle, count }: { label: string; open: boolean; onToggle: () => void; count: number }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
      </svg>
      {label}
      <span className="ml-auto text-slate-400 dark:text-slate-600 font-normal">{count}</span>
    </button>
  );
}

export function MessageList({ messages, selectedUid, onSelect }: MessageListProps) {
  const [todayOpen, setTodayOpen] = useState(true);
  const [olderOpen, setOlderOpen] = useState(true);

  const todayMsgs = messages.filter((m) => isToday(m.date));
  const olderMsgs = messages.filter((m) => !isToday(m.date));

  function renderMsg(msg: Message) {
    const name = parseFrom(msg.from);
    const initials = getInitials(msg.from);
    const color = getColor(msg.from);
    const isUnread = !msg.flags.includes('\\Seen');
    const isSelected = selectedUid === msg.uid;

    return (
      <button
        key={msg.uid}
        onClick={() => onSelect(msg.uid)}
        className={clsx(
          'w-full text-left px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/70 hover:bg-blue-50/60 dark:hover:bg-blue-500/5 transition-colors',
          isSelected && 'bg-blue-100/70 dark:bg-blue-500/15 border-l-2 border-l-blue-500'
        )}
      >
        <div className="flex gap-2.5 items-start">
          {/* Unread dot */}
          <div className="mt-2 w-1.5 h-1.5 rounded-full shrink-0">
            {isUnread && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
          </div>

          {/* Avatar */}
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
            color
          )}>
            {initials}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-1 mb-0.5">
              <span className={clsx(
                'text-sm truncate leading-tight',
                isUnread ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'
              )}>
                {name}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                {formatTime(msg.date)}
              </span>
            </div>
            <p className={clsx(
              'text-xs truncate',
              isUnread ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'
            )}>
              {msg.subject}
            </p>
          </div>
        </div>
      </button>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm py-12">
        No messages
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {todayMsgs.length > 0 && (
        <>
          <GroupHeader label="Today" open={todayOpen} onToggle={() => setTodayOpen(!todayOpen)} count={todayMsgs.length} />
          {todayOpen && todayMsgs.map(renderMsg)}
        </>
      )}
      {olderMsgs.length > 0 && (
        <>
          <GroupHeader label="Older" open={olderOpen} onToggle={() => setOlderOpen(!olderOpen)} count={olderMsgs.length} />
          {olderOpen && olderMsgs.map(renderMsg)}
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

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
  onRefresh?: () => void;
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
  const clean = str.replace(/<[^>]+>/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase() || '?';
}

function parseName(from: string): string {
  const match = from.match(/^(.+?)\s*</);
  return match ? match[1].trim() : from.split('@')[0];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isSameDay = d.toDateString() === now.toDateString();
  if (isSameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString([], { day: 'numeric', month: '2-digit' });
  return d.toLocaleDateString([], { day: 'numeric', month: '2-digit' });
}

export function MessageList({ messages, selectedUid, onSelect, folder, mailbox, onRefresh }: MessageListProps) {
  const [starred, setStarred] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const queryClient = useQueryClient();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['messages', folder, mailbox] });
    onRefresh?.();
  }

  async function bulkMove(destFolder: string) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await api('/mail/bulk/move', {
        method: 'POST',
        body: JSON.stringify({ folder, uids: Array.from(selected), destFolder, mailbox }),
      });
      toast.success(`Moved ${selected.size} message(s)`);
      setSelected(new Set());
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBulkLoading(false);
    }
  }

  async function bulkSnooze(until: Date) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((messageUid) =>
          api('/snooze', {
            method: 'POST',
            body: JSON.stringify({ messageUid, folder, mailbox: mailbox || undefined, snoozeUntil: until.toISOString() }),
          })
        )
      );
      toast.success(`Snoozed ${selected.size} message(s)`);
      setSelected(new Set());
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBulkLoading(false);
    }
  }

  async function bulkMarkRead(read: boolean) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await api('/mail/bulk/flags', {
        method: 'POST',
        body: JSON.stringify({ folder, uids: Array.from(selected), flags: ['\\Seen'], add: read, mailbox }),
      });
      toast.success(read ? 'Marked as read' : 'Marked as unread');
      setSelected(new Set());
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBulkLoading(false);
    }
  }

  function toggleSelect(e: React.MouseEvent, uid: number) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  }

  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const snoozeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSnoozeMenu) return;
    const h = () => setShowSnoozeMenu(false);
    setTimeout(() => document.addEventListener('click', h), 0);
    return () => document.removeEventListener('click', h);
  }, [showSnoozeMenu]);

  const snoozeOptions = [
    { label: '1 hour', until: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d; } },
    { label: '3 hours', until: () => { const d = new Date(); d.setHours(d.getHours() + 3); return d; } },
    { label: 'Tomorrow', until: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0); return d; } },
    { label: 'Next week', until: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(8, 0, 0); return d; } },
  ];

  function toggleSelectAll() {
    if (selected.size === messages.length) setSelected(new Set());
    else setSelected(new Set(messages.map((m) => m.uid)));
  }

  function toggleStar(e: React.MouseEvent, uid: number) {
    e.stopPropagation();
    setStarred((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-12">
        No messages
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/30 shrink-0">
          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">{selected.size} selected</span>
          <button onClick={() => bulkMarkRead(true)} disabled={bulkLoading} className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-700/50 disabled:opacity-50">Read</button>
          <button onClick={() => bulkMarkRead(false)} disabled={bulkLoading} className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-700/50 disabled:opacity-50">Unread</button>
          {folder !== 'trash' && <button onClick={() => bulkMove('Trash')} disabled={bulkLoading} className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 disabled:opacity-50">Delete</button>}
          {folder === 'inbox' && <button onClick={() => bulkMove('Sent')} disabled={bulkLoading} className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-700/50 disabled:opacity-50">Archive</button>}
          <div className="relative" ref={snoozeMenuRef}>
            <button onClick={(e) => { e.stopPropagation(); setShowSnoozeMenu(!showSnoozeMenu); }} disabled={bulkLoading} className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50 disabled:opacity-50">Snooze</button>
            {showSnoozeMenu && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 min-w-[120px]">
                {snoozeOptions.map((o) => (
                  <button key={o.label} onClick={() => { bulkSnooze(o.until()); setShowSnoozeMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700">
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setSelected(new Set())} className="text-xs px-2 py-0.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 ml-auto">Cancel</button>
        </div>
      )}
    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
      {messages.map((msg) => {
        const name = parseName(msg.from);
        const initials = getInitials(msg.from);
        const color = getColor(msg.from);
        const isUnread = !msg.flags.includes('\\Seen');
        const isSelected = selectedUid === msg.uid;
        const isStarred = starred.has(msg.uid);

        return (
          <button
            key={msg.uid}
            onClick={() => onSelect(msg.uid)}
            className={clsx(
              'w-full text-left px-3 py-3.5 rounded-xl transition-all flex items-start gap-2',
              isSelected
                ? 'bg-white dark:bg-slate-800 shadow-sm shadow-slate-200/80 dark:shadow-none border border-slate-100 dark:border-slate-700'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <input
              type="checkbox"
              checked={selected.has(msg.uid)}
              onChange={() => {}}
              onClick={(e) => toggleSelect(e, msg.uid)}
              className="mt-2.5 rounded text-emerald-500 shrink-0"
            />
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Avatar */}
              <div className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-white',
                color
              )}>
                {initials}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className={clsx(
                    'text-sm leading-tight truncate max-w-[140px]',
                    isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                  )}>
                    {name}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0 leading-tight">{formatTime(msg.date)}</span>
                </div>
                <div className="flex items-end justify-between gap-1">
                  <p className="text-xs text-slate-500 truncate flex-1 leading-relaxed">
                    {msg.subject}
                  </p>
                  <button
                    onClick={(e) => toggleStar(e, msg.uid)}
                    className="shrink-0 ml-1 transition-colors"
                  >
                    <svg
                      className={clsx('w-3.5 h-3.5', isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-amber-300')}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
    </div>
  );
}

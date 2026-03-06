'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, apiFormData } from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

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

interface MessageDetail {
  subject: string;
  from: string;
  to: string;
  date: string;
  html?: string;
  text?: string;
  attachments: { filename: string; contentType: string; size: number }[];
}

interface ThreadViewProps {
  thread: Thread;
  folder: string;
  mailbox?: string;
}

const avatarPalette = [
  'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-sky-400',
  'bg-violet-400', 'bg-teal-400', 'bg-orange-400',
];

function getColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h += str.charCodeAt(i);
  return avatarPalette[h % avatarPalette.length];
}

function getInitials(str: string) {
  const clean = str.replace(/<[^>]+>/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : clean.slice(0, 2).toUpperCase() || '?';
}

function parseName(from: string) {
  const match = from.match(/^(.+?)\s*</);
  return match ? match[1].trim() : from.split('@')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function downloadAttachment(uid: number, attId: number, folder: string, mailbox?: string, filename?: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const params = new URLSearchParams({ folder });
  if (mailbox) params.set('mailbox', mailbox);
  fetch(`${API_BASE}/mail/attachments/${uid}/${attId}?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((r) => r.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'attachment';
      a.click();
      URL.revokeObjectURL(url);
    });
}

function ThreadMessage({ msg, folder, mailbox, isLast }: { msg: Message; folder: string; mailbox?: string; isLast: boolean }) {
  const [expanded, setExpanded] = useState(isLast);

  const { data, isLoading } = useQuery({
    queryKey: ['message', msg.uid, folder, mailbox],
    queryFn: () => {
      const params = new URLSearchParams({ folder });
      if (mailbox) params.set('mailbox', mailbox);
      return api<MessageDetail>(`/mail/messages/${msg.uid}?${params}`);
    },
    enabled: expanded,
  });

  const name = parseName(msg.from);
  const initials = getInitials(msg.from);
  const color = getColor(msg.from);
  const isUnread = !msg.flags.includes('\\Seen');

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
      >
        <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0', color)}>
          {initials}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={clsx('text-sm shrink-0', isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700')}>
            {name}
          </span>
          <span className="text-xs text-slate-400 truncate">
            — {msg.subject}
          </span>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{formatDate(msg.date)}</span>
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => { if (!isLast) setExpanded(false); }}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left"
      >
        <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', color)}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{name}</span>
            {isUnread && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
          </div>
          <p className="text-xs text-slate-400 truncate">To: {msg.to || '…'}</p>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{formatDate(msg.date)}</span>
        {!isLast && (
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </button>

      <div className="px-5 py-4">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : data ? (
          <>
            <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed">
              {data.html ? (
                <div dangerouslySetInnerHTML={{ __html: data.html }} />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                  {data.text || '(No content)'}
                </pre>
              )}
            </div>

            {data.attachments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                {data.attachments.map((att, i) => (
                  <button
                    key={i}
                    onClick={() => downloadAttachment(msg.uid, i, folder, mailbox, att.filename)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-slate-700 max-w-[120px] truncate">{att.filename}</p>
                      <p className="text-xs text-slate-400">{(att.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">Could not load message</p>
        )}
      </div>
    </div>
  );
}

export function ThreadView({ thread, folder, mailbox }: ThreadViewProps) {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const { data: mailboxesData } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api<{ mailboxes: { id: string; email: string; type: string; can_send_as: boolean }[] }>('/mailboxes'),
  });
  const mailboxes = mailboxesData?.mailboxes ?? [];
  const fromAddr = mailboxes.find((m) => m.type === 'personal' || m.can_send_as)?.email || '';

  const lastMsg = thread.messages[thread.messages.length - 1];

  function extractEmail(addr: string): string {
    const m = addr.match(/<([^>]+)>/);
    return m ? m[1] : addr.trim();
  }

  async function sendQuickReply() {
    if (!replyText.trim() || !lastMsg || !fromAddr) return;
    const toEmail = extractEmail(lastMsg.from);
    const reSubject = thread.subject.toLowerCase().startsWith('re:') ? thread.subject : `Re: ${thread.subject}`;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('from', fromAddr);
      formData.append('to', JSON.stringify([toEmail]));
      formData.append('subject', reSubject);
      formData.append('html', replyText.replace(/\n/g, '<br>'));
      await apiFormData('/mail/send', formData);
      toast.success('Reply sent');
      setReplyText('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 shrink-0">
        <p className="text-xs text-slate-400 mb-1">{thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''} in this conversation</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{thread.subject}</h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex -space-x-2">
            {thread.participants.slice(0, 4).map((p) => (
              <div
                key={p}
                className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white', getColor(p))}
                title={p}
              >
                {getInitials(p)}
              </div>
            ))}
          </div>
          <span className="text-xs text-slate-400">{thread.participants.join(', ')}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 space-y-2 pb-4">
        {thread.messages.map((msg, idx) => (
          <ThreadMessage
            key={msg.uid}
            msg={msg}
            folder={folder}
            mailbox={mailbox}
            isLast={idx === thread.messages.length - 1}
          />
        ))}
      </div>

      {/* Reply box */}
      <div className="shrink-0 mx-6 mb-5 mt-3 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Reply to this conversation..."
          rows={3}
          className="w-full px-5 py-4 text-sm text-slate-700 placeholder-slate-400 bg-white outline-none resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-1">
            <button title="Attach file" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
          </div>
          <button
            onClick={sendQuickReply}
            disabled={!replyText.trim() || sending || !fromAddr}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-default text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-200"
          >
            {sending ? 'Sending…' : 'Reply'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

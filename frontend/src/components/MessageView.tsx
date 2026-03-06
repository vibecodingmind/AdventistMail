'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface Message {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  flags: string[];
}

interface MessageViewProps {
  uid: number;
  folder: string;
  mailbox?: string;
  allMessages?: Message[];
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

const avatarPalette = [
  'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-sky-400',
  'bg-violet-400', 'bg-teal-400', 'bg-orange-400',
];
function getColor(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) h += str.charCodeAt(i);
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

const labelColors: Record<string, string> = {
  work: 'bg-slate-200 text-slate-600',
  important: 'bg-amber-100 text-amber-700',
  personal: 'bg-emerald-100 text-emerald-700',
  promising: 'bg-amber-100 text-amber-700',
  business: 'bg-sky-100 text-sky-700',
};

export function MessageView({ uid, folder, mailbox, allMessages = [] }: MessageViewProps) {
  const [replyText, setReplyText] = useState('');
  const [activeLabel] = useState('Promising offers');

  const { data, isLoading } = useQuery({
    queryKey: ['message', uid, folder, mailbox],
    queryFn: () => {
      const params = new URLSearchParams({ folder });
      if (mailbox) params.set('mailbox', mailbox);
      return api<{
        subject: string;
        from: string;
        to: string;
        date: string;
        html?: string;
        text?: string;
        attachments: { filename: string; contentType: string; size: number }[];
      }>(`/mail/messages/${uid}?${params}`);
    },
  });

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
  );
  if (!data) return (
    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Message not found</div>
  );

  const fromName = parseName(data.from);
  const fromInitials = getInitials(data.from);
  const fromColor = getColor(data.from);

  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) + ', ' + new Date(data.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Build thread list from allMessages (last 3 before current, most recent first)
  const threadMsgs = allMessages
    .filter((m) => m.uid !== uid)
    .slice(0, 2)
    .reverse();

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
        {/* Label tag */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium">
            {activeLabel}
            <button className="hover:opacity-70 transition-opacity">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {[
            { title: 'Star', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
            { title: 'Copy', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
            { title: 'Notify', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
            { title: 'More', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" /></svg> },
          ].map(({ title, icon }) => (
            <button
              key={title}
              title={title}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-6">
        {/* Date + Subject */}
        <p className="text-xs text-slate-400 mb-2">{formattedDate}</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">{data.subject}</h1>

        {/* Thread list (previous messages condensed) */}
        {threadMsgs.length > 0 && (
          <div className="mb-4 space-y-1 border-b border-slate-100 pb-4">
            {threadMsgs.map((m) => {
              const tName = parseName(m.from);
              const tInitials = getInitials(m.from);
              const tColor = getColor(m.from);
              const tDate = new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
                ' ' + new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={m.uid} className="flex items-center gap-3 py-2 hover:bg-slate-50 rounded-lg px-2 transition-colors cursor-pointer">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${tColor}`}>
                    {tInitials}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700 shrink-0">{tName}</span>
                    <span className="text-xs text-slate-400 truncate">- {m.subject}</span>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{tDate}</span>
                </div>
              );
            })}
            {/* Current sender header in thread */}
            <div className="flex items-center gap-3 py-2 px-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${fromColor}`}>
                {fromInitials}
              </div>
              <span className="text-sm font-bold text-slate-800">{fromName}</span>
            </div>
          </div>
        )}

        {/* Message body */}
        <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed">
          {data.html ? (
            <div dangerouslySetInnerHTML={{ __html: data.html }} />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
              {data.text || '(No content)'}
            </pre>
          )}
        </div>

        {/* Attachments */}
        {data.attachments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            {data.attachments.map((att, i) => (
              <button
                key={i}
                onClick={() => downloadAttachment(uid, i, folder, mailbox, att.filename)}
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
      </div>

      {/* ── Reply Compose Box ── */}
      <div className="shrink-0 mx-6 mb-5 mt-3 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Textarea */}
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Write your message..."
          rows={4}
          className="w-full px-5 py-4 text-sm text-slate-700 placeholder-slate-400 bg-white outline-none resize-none leading-relaxed"
        />

        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 px-4 py-2 border-t border-slate-100 bg-white">
          {[
            { label: 'B', title: 'Bold', cls: 'font-bold' },
            { label: 'I', title: 'Italic', cls: 'italic' },
            { label: 'U', title: 'Underline', cls: 'underline' },
            { label: 'S̶', title: 'Strikethrough', cls: '' },
          ].map(({ label, title, cls }) => (
            <button
              key={title}
              title={title}
              className={`w-7 h-7 flex items-center justify-center rounded text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors ${cls}`}
            >
              {label}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-200 mx-1" />
          {/* Bullet list */}
          <button title="Bullet list" className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
          </button>
          {/* Numbered list */}
          <button title="Numbered list" className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {/* Alignment buttons */}
          {['left', 'center', 'right', 'justify'].map((align) => (
            <button
              key={align}
              title={`Align ${align}`}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {align === 'left' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />}
                {align === 'center' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />}
                {align === 'right' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />}
                {align === 'justify' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          ))}
        </div>

        {/* Bottom action row */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-1">
            {/* Attach */}
            <button title="Attach file" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            {/* Calendar */}
            <button title="Schedule" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Delete draft */}
            <button title="Discard" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            {/* More */}
            <button title="More options" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>
            {/* Send */}
            <button
              disabled={!replyText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-default text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-200"
            >
              Send
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

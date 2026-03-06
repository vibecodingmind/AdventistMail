'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

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

interface MessageViewProps {
  uid: number;
  folder: string;
  mailbox?: string;
  total?: number;
}

function getInitials(str: string): string {
  const clean = str.replace(/<[^>]+>/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase() || '?';
}

const avatarPalette = [
  'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500',
  'bg-violet-500', 'bg-teal-500', 'bg-orange-500',
];
function getColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h += str.charCodeAt(i);
  return avatarPalette[h % avatarPalette.length];
}

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>/);
  if (match) return { name: match[1].trim(), email: match[2] };
  return { name: from, email: from };
}

export function MessageView({ uid, folder, mailbox, total }: MessageViewProps) {
  const [replyOpen, setReplyOpen] = useState(false);

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

  const { name: fromName, email: fromEmail } = parseFrom(data.from);
  const { name: toName } = parseFrom(data.to);
  const initials = getInitials(data.from);
  const color = getColor(data.from);

  const formattedDate = new Date(data.date).toLocaleString('en-US', {
    weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Subject + meta row */}
      <div className="flex items-start justify-between px-6 pt-5 pb-3">
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug flex-1 pr-4">
          {data.subject}
        </h1>
        <div className="flex items-center gap-1 shrink-0">
          {/* Print */}
          <button className="p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Print">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
          {/* More */}
          <button className="p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="More">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thread / older emails hint */}
      {total && total > 1 && (
        <div className="mx-6 mb-3">
          <button className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-500 dark:text-slate-400 rounded-full transition-colors">
            Show {total - 1} older email{total - 1 !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* From/To header */}
      <div className="mx-6 mb-4 flex items-start gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${color}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">From: </span>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{fromName}</button>
                <span className="text-xs text-slate-400 dark:text-slate-500">&lt;{fromEmail}&gt;</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">To: </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">{toName}</span>
                <button className="text-xs text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{formattedDate}</span>
              <button className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Reply">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="More">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
          {data.html ? (
            <div dangerouslySetInnerHTML={{ __html: data.html }} />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {data.text || '(No content)'}
            </pre>
          )}
        </div>

        {/* Attachments */}
        {data.attachments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Attachments ({data.attachments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {data.attachments.map((att, i) => (
                <button
                  key={i}
                  onClick={() => downloadAttachment(uid, i, folder, mailbox, att.filename)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">{att.filename}</p>
                    <p className="text-xs text-slate-400">{(att.size / 1024).toFixed(0)} KB</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reply bar */}
      <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        {replyOpen ? (
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
            <textarea
              autoFocus
              rows={4}
              placeholder="Write a reply..."
              className="w-full px-4 py-3 text-sm text-slate-800 dark:text-slate-200 bg-transparent outline-none resize-none placeholder-slate-400"
            />
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => setReplyOpen(false)} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                Cancel
              </button>
              <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
                Send
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setReplyOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply to {fromName}
          </button>
        )}
      </div>
    </div>
  );
}

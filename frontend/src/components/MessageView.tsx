'use client';

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
}

export function MessageView({ uid, folder, mailbox }: MessageViewProps) {
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

  if (isLoading) return <div className="p-8 text-slate-500 dark:text-slate-400">Loading...</div>;
  if (!data) return <div className="p-8 text-slate-500 dark:text-slate-400">Message not found</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">{data.subject}</h1>
      <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <span><strong className="text-slate-700 dark:text-slate-300">From:</strong> {data.from}</span>
        <span><strong className="text-slate-700 dark:text-slate-300">To:</strong> {data.to}</span>
        <span><strong className="text-slate-700 dark:text-slate-300">Date:</strong> {new Date(data.date).toLocaleString()}</span>
      </div>
      <div className="prose prose-slate prose-sm max-w-none">
        {data.html ? (
          <div dangerouslySetInnerHTML={{ __html: data.html }} />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300">{data.text || '(No content)'}</pre>
        )}
      </div>
      {data.attachments.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Attachments</p>
          <div className="space-y-1">
            {data.attachments.map((att, i) => (
              <button
                key={i}
                onClick={() => downloadAttachment(uid, i, folder, mailbox, att.filename)}
                className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {att.filename}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

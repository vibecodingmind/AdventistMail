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

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (!data) return <div className="p-4">Message not found</div>;

  return (
    <div className="p-4 max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">{data.subject}</h1>
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
        <span><strong>From:</strong> {data.from}</span>
        <span><strong>To:</strong> {data.to}</span>
        <span><strong>Date:</strong> {new Date(data.date).toLocaleString()}</span>
      </div>
      <div className="prose prose-sm max-w-none">
        {data.html ? (
          <div dangerouslySetInnerHTML={{ __html: data.html }} />
        ) : (
          <pre className="whitespace-pre-wrap font-sans">{data.text || '(No content)'}</pre>
        )}
      </div>
      {data.attachments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Attachments</p>
          <div className="space-y-1">
            {data.attachments.map((att, i) => (
              <button
                key={i}
                onClick={() => downloadAttachment(uid, i, folder, mailbox, att.filename)}
                className="block text-sm text-blue-600 hover:underline text-left"
              >
                {att.filename}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

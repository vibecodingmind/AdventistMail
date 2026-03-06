'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { api, apiFormData } from '@/lib/api';
import toast from 'react-hot-toast';

interface Mailbox {
  id: string;
  email: string;
  type: string;
  can_send_as: boolean;
}

interface ComposeWindowProps {
  onClose: () => void;
  defaultMailbox?: string;
}

export function ComposeWindow({ onClose, defaultMailbox }: ComposeWindowProps) {
  const [from, setFrom] = useState(defaultMailbox || '');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const { data } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api<{ mailboxes: Mailbox[] }>('/mailboxes'),
  });

  const mailboxes = data?.mailboxes ?? [];
  const sendableMailboxes = mailboxes.filter((m) => m.type === 'personal' || m.can_send_as);

  useEffect(() => {
    if (sendableMailboxes.length > 0 && !from) {
      setFrom(defaultMailbox || sendableMailboxes[0].email);
    }
  }, [sendableMailboxes, from, defaultMailbox]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (accepted) => setFiles((f) => [...f, ...accepted]),
    maxSize: 25 * 1024 * 1024,
  });

  async function handleSend() {
    if (!to.trim()) {
      toast.error('Please enter a recipient');
      return;
    }
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('from', from);
      formData.append('to', JSON.stringify(to.split(',').map((e) => e.trim()).filter(Boolean)));
      formData.append('subject', subject);
      formData.append('html', body);
      files.forEach((f) => formData.append('attachments', f));

      await apiFormData('/mail/send', formData);
      toast.success('Email sent');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">New Message</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {sendableMailboxes.map((m) => (
                <option key={m.id} value={m.email}>
                  {m.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@church.org"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:border-gray-400">
            <input {...getInputProps()} />
            <p className="text-sm text-gray-500">Drag & drop attachments or click to select</p>
            {files.length > 0 && (
              <p className="text-xs text-gray-600 mt-2">{files.map((f) => f.name).join(', ')}</p>
            )}
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

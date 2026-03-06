'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import clsx from 'clsx';

interface Mailbox {
  id: string;
  email: string;
  type: string;
  display_name: string | null;
  can_send_as: boolean;
}

export function MailboxSelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api<{ mailboxes: Mailbox[] }>('/mailboxes'),
  });

  const mailboxes = data?.mailboxes ?? [];
  const currentMailbox = selected
    ? mailboxes.find((m) => m.email === selected)
    : mailboxes[0];
  const sendableMailboxes = mailboxes.filter((m) => m.type === 'personal' || m.can_send_as);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-100 text-sm font-medium text-gray-700"
      >
        <span>From:</span>
        <span className="text-gray-900">{currentMailbox?.display_name || currentMailbox?.email || 'Select'}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
            {sendableMailboxes.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelected(m.email);
                  setOpen(false);
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mailbox-selected', { detail: m.email }));
                  }
                }}
                className={clsx(
                  'w-full text-left px-4 py-2 text-sm hover:bg-gray-50',
                  selected === m.email ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                )}
              >
                {m.display_name || m.email}
                <span className="block text-xs text-gray-500">{m.email}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

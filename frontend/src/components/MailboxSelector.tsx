'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api<{ mailboxes: Mailbox[] }>('/mailboxes'),
  });

  const mailboxes = data?.mailboxes ?? [];
  const currentMailboxEmail = searchParams.get('mailbox') || mailboxes[0]?.email;
  const currentMailbox = mailboxes.find((m) => m.email === currentMailboxEmail) || mailboxes[0];
  const sendableMailboxes = mailboxes.filter((m) => m.type === 'personal' || m.can_send_as);

  function selectMailbox(email: string) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (email === mailboxes[0]?.email) {
      params.delete('mailbox');
    } else {
      params.set('mailbox', email);
    }
    const qs = params.toString();
    router.push(pathname + (qs ? `?${qs}` : ''));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
      >
        <span className="text-slate-500">From:</span>
        <span className="text-slate-900">{currentMailbox?.display_name || currentMailbox?.email || 'Select'}</span>
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-xl shadow-lg border border-slate-200 z-20 py-1">
            {sendableMailboxes.map((m) => (
              <button
                key={m.id}
                onClick={() => selectMailbox(m.email)}
                className={clsx(
                  'w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors',
                  currentMailbox?.email === m.email ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                )}
              >
                {m.display_name || m.email}
                <span className="block text-xs text-slate-500 mt-0.5">{m.email}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

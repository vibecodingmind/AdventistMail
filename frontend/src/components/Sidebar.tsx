'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { ComposeWindow } from './ComposeWindow';

interface Mailbox {
  id: string;
  email: string;
  type: string;
  display_name: string | null;
}

const navItems = [
  {
    href: '/mail',
    exact: true,
    label: 'Inbox',
    badge: 1,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/mail/sent',
    exact: false,
    label: 'Sent Emails',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    href: '/mail/starred',
    exact: false,
    label: 'Favourite',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    href: '/mail/drafts',
    exact: false,
    label: 'Draft',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    href: '/mail/trash',
    exact: false,
    label: 'Deleted',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
];

const labels = [
  { name: 'Work', color: 'bg-slate-300' },
  { name: 'Promising offers', color: 'bg-amber-300' },
  { name: 'Work in Progress', color: 'bg-emerald-400' },
  { name: 'In acceptance', color: 'bg-sky-300' },
  { name: 'Read later', color: 'bg-violet-300' },
];

function NavItem({ href, exact, label, icon, badge }: typeof navItems[0]) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href || pathname === href + '/'
    : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
        isActive
          ? 'text-emerald-600 bg-emerald-50'
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
      }`}
    >
      <span className={isActive ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-500'}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="w-5 h-5 flex items-center justify-center bg-emerald-500 text-white text-xs font-bold rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mailbox = searchParams.get('mailbox') || undefined;
  const [composeOpen, setComposeOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { data } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api<{ mailboxes: Mailbox[] }>('/mailboxes'),
  });

  const sharedMailboxes = (data?.mailboxes ?? []).filter((m) => m.type === 'shared');

  function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  }

  if (collapsed) {
    return (
      <div className="w-14 flex flex-col items-center py-4 border-r border-slate-100 bg-white">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-[240px] flex flex-col border-r border-slate-100 bg-white shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-5 pb-4">
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Mailbox</h1>
      </div>

      {/* New message */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setComposeOpen(true)}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          New message
        </button>
      </div>

      <div className="h-px bg-slate-100 mx-4 mb-2" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 w-full transition-all">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          More
        </button>

        {/* Shared mailboxes */}
        {sharedMailboxes.map((m) => (
          <Link
            key={m.id}
            href={`/mail?mailbox=${encodeURIComponent(m.email)}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 truncate"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            {m.display_name || m.email}
          </Link>
        ))}
      </nav>

      {/* Labels */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Labels</span>
          <div className="flex items-center gap-1">
            <button className="w-6 h-6 flex items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {labels.map((label) => (
            <button
              key={label.name}
              className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity group"
            >
              <div className={`w-8 h-4 rounded-full ${label.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
              <span className="text-sm text-slate-600">{label.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 border-t border-slate-100 pt-3 flex items-center gap-2">
        <Link href="/admin" className="flex-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          Admin
        </Link>
        <button
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Logout
        </button>
      </div>

      {composeOpen && (
        <ComposeWindow onClose={() => setComposeOpen(false)} defaultMailbox={mailbox} />
      )}
    </div>
  );
}

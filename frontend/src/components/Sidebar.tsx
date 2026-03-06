'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { ComposeButton } from './ComposeButton';

interface Mailbox {
  id: string;
  email: string;
  type: string;
  display_name: string | null;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors select-none"
    >
      <ChevronIcon open={open} />
      {label}
    </button>
  );
}

function FolderItem({
  href,
  icon,
  label,
  badge,
  dot,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  dot?: string;
}) {
  const pathname = usePathname();
  const isActive = href
    ? href === '/mail'
      ? pathname === '/mail' || pathname === '/mail/'
      : pathname.startsWith(href)
    : false;

  const cls = `flex items-center gap-2 w-full px-3 py-[5px] rounded text-sm transition-colors ${
    isActive
      ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-medium'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
  }`;

  const inner = (
    <>
      {dot ? (
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
      ) : (
        <span className={`shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
          isActive ? 'bg-blue-200 dark:bg-blue-500/30 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
        }`}>
          {badge}
        </span>
      )}
    </>
  );

  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button className={cls}>{inner}</button>;
}

const icons = {
  allInboxes: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  unread: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <circle cx="12" cy="12" r="3" fill="currentColor" strokeWidth={0} />
    </svg>
  ),
  flagged: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21V5l9 4 9-4v16" />
    </svg>
  ),
  snoozed: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  unreplied: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  ),
  inbox: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  sent: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  trash: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  drafts: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  junk: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  settings: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

export function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mailbox = searchParams.get('mailbox') || undefined;

  const [favOpen, setFavOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(true);

  const { data } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api<{ mailboxes: Mailbox[] }>('/mailboxes'),
  });

  const mailboxes = data?.mailboxes ?? [];
  const sharedMailboxes = mailboxes.filter((m) => m.type === 'shared');

  function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  }

  return (
    <aside className="w-52 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 font-sans select-none">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 px-2 mb-2">Mail</h2>
        <ComposeButton mailbox={mailbox} />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">

        {/* Favorites */}
        <SectionHeader label="Favorites" open={favOpen} onToggle={() => setFavOpen(!favOpen)} />
        {favOpen && (
          <div className="space-y-px ml-1">
            <FolderItem href="/mail" icon={icons.allInboxes} label="All Inboxes" badge={45} />
            <FolderItem href="/mail/unread" icon={icons.unread} label="Unread" />
            <FolderItem href="/mail/flagged" icon={icons.flagged} label="Flagged" />
            <FolderItem href="/mail/snoozed" icon={icons.snoozed} label="Snoozed" />
            <FolderItem href="/mail/starred" icon={icons.unreplied} label="Unreplied" />
          </div>
        )}

        <div className="pt-1" />

        {/* Tags */}
        <SectionHeader label="Tags" open={tagsOpen} onToggle={() => setTagsOpen(!tagsOpen)} />
        {tagsOpen && (
          <div className="space-y-px ml-1">
            <FolderItem icon={null} label="Important" dot="bg-yellow-400" />
            <FolderItem icon={null} label="Personal" dot="bg-red-500" />
            <FolderItem icon={null} label="Business" dot="bg-green-500" />
            <FolderItem icon={null} label="Sport" dot="bg-blue-500" />
          </div>
        )}

        <div className="pt-1" />

        {/* Account */}
        <SectionHeader label="My Account" open={accountOpen} onToggle={() => setAccountOpen(!accountOpen)} />
        {accountOpen && (
          <div className="space-y-px ml-1">
            <FolderItem href="/mail" icon={icons.inbox} label="Inbox" />
            <FolderItem href="/mail/sent" icon={icons.sent} label="Sent" />
            <FolderItem href="/mail/trash" icon={icons.trash} label="Trash" />
            <FolderItem href="/mail/drafts" icon={icons.drafts} label="Drafts" />
            <FolderItem href="/mail/spam" icon={icons.junk} label="Junk E-mail" />
          </div>
        )}

        {/* Shared mailboxes */}
        {sharedMailboxes.length > 0 && (
          <>
            <div className="pt-1" />
            <SectionHeader label="Shared" open={true} onToggle={() => {}} />
            <div className="space-y-px ml-1">
              {sharedMailboxes.map((m) => (
                <FolderItem
                  key={m.id}
                  href={`/mail?mailbox=${encodeURIComponent(m.email)}`}
                  icon={icons.inbox}
                  label={m.display_name || m.email}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 pb-2 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-px">
        <FolderItem href="/admin" icon={icons.settings} label="Admin" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-[5px] rounded text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <span className="text-slate-400">{icons.logout}</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

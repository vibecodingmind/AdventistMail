'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Mailbox {
  id: string;
  email: string;
  type: string;
  display_name: string | null;
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={`block px-4 py-2 rounded-r-full text-sm ${
        active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}

export function Sidebar() {
  const { data } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api<{ mailboxes: Mailbox[] }>('/mailboxes'),
  });

  const mailboxes = data?.mailboxes ?? [];
  const sharedMailboxes = mailboxes.filter((m) => m.type === 'shared');

  return (
    <aside className="w-56 border-r border-gray-200 flex flex-col bg-gray-50">
      <Link href="/mail" className="p-4 text-lg font-semibold text-gray-800">
        Church Mail
      </Link>
      <nav className="flex-1 px-2 py-2 space-y-1">
        <NavLink href="/mail">Inbox</NavLink>
        <NavLink href="/mail/starred">Starred</NavLink>
        <NavLink href="/mail/sent">Sent</NavLink>
        <NavLink href="/mail/drafts">Drafts</NavLink>
        <NavLink href="/mail/spam">Spam</NavLink>
        <NavLink href="/mail/trash">Trash</NavLink>
      </nav>
      {sharedMailboxes.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Shared Mailboxes
          </p>
          <div className="space-y-1">
            {sharedMailboxes.map((m) => (
              <Link
                key={m.id}
                href={`/mail?mailbox=${encodeURIComponent(m.email)}`}
                className="block py-1 text-sm text-gray-600 truncate hover:text-gray-900"
              >
                {m.display_name || m.email}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="p-2 border-t border-gray-200">
        <Link
          href="/admin"
          className="block px-4 py-2 rounded-r-full text-sm text-gray-600 hover:bg-gray-100"
        >
          Admin
        </Link>
      </div>
    </aside>
  );
}

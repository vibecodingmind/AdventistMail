'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { ComposeWindow } from './ComposeWindow';
import toast from 'react-hot-toast';

interface Mailbox {
  id: string;
  email: string;
  type: string;
  display_name: string | null;
}

const SYSTEM_FOLDERS = ['INBOX', 'Sent', 'Drafts', 'Junk', 'Trash', 'Spam'];

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
  const queryClient = useQueryClient();
  const mailbox = searchParams.get('mailbox') || undefined;
  const [composeOpen, setComposeOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api<{ mailboxes: Mailbox[] }>('/mailboxes'),
  });

  const { data: foldersData } = useQuery({
    queryKey: ['folders', mailbox],
    queryFn: () => {
      const params = mailbox ? `?mailbox=${encodeURIComponent(mailbox)}` : '';
      return api<{ folders: { path: string }[] }>(`/mail/folders${params}`);
    },
  });

  const allFolders = foldersData?.folders ?? [];
  const customFolders = allFolders
    .map((f) => f.path)
    .filter((p) => !SYSTEM_FOLDERS.includes(p) && p !== 'INBOX');

  const sharedMailboxes = (data?.mailboxes ?? []).filter((m) => m.type === 'shared');

  useEffect(() => {
    if (!folderMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setFolderMenuOpen(null);
      }
    };
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [folderMenuOpen]);

  useEffect(() => {
    if (creatingFolder) newFolderInputRef.current?.focus();
  }, [creatingFolder]);

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api('/mail/folders', {
        method: 'POST',
        body: JSON.stringify({ name: newFolderName.trim(), mailbox }),
      });
      toast.success('Folder created');
      setNewFolderName('');
      setCreatingFolder(false);
      queryClient.invalidateQueries({ queryKey: ['folders', mailbox] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleRenameFolder(oldName: string) {
    if (!renameValue.trim() || renameValue.trim() === oldName) {
      setRenamingFolder(null);
      return;
    }
    try {
      await api('/mail/folders', {
        method: 'PATCH',
        body: JSON.stringify({ oldName, newName: renameValue.trim(), mailbox }),
      });
      toast.success('Folder renamed');
      setRenamingFolder(null);
      queryClient.invalidateQueries({ queryKey: ['folders', mailbox] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleDeleteFolder(name: string) {
    if (!confirm(`Delete folder "${name}"? Messages in it may be lost.`)) return;
    try {
      await api('/mail/folders', {
        method: 'DELETE',
        body: JSON.stringify({ name, mailbox }),
      });
      toast.success('Folder deleted');
      setFolderMenuOpen(null);
      queryClient.invalidateQueries({ queryKey: ['folders', mailbox] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

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

      {/* Custom Folders */}
      {customFolders.length > 0 || creatingFolder ? (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Folders</span>
            <button
              onClick={() => setCreatingFolder(true)}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors"
              title="Create folder"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {creatingFolder && (
            <form onSubmit={handleCreateFolder} className="mb-2 flex gap-1">
              <input
                ref={newFolderInputRef}
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400"
                onKeyDown={(e) => { if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); } }}
              />
              <button type="submit" className="px-2 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                Add
              </button>
            </form>
          )}

          <div className="space-y-0.5">
            {customFolders.map((folderPath) => (
              <div key={folderPath} className="relative group">
                {renamingFolder === folderPath ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRenameFolder(folderPath); }}
                    className="flex gap-1 py-1"
                  >
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Escape') setRenamingFolder(null); }}
                      onBlur={() => handleRenameFolder(folderPath)}
                    />
                  </form>
                ) : (
                  <Link
                    href={`/mail?folder=${encodeURIComponent(folderPath)}${mailbox ? `&mailbox=${encodeURIComponent(mailbox)}` : ''}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all"
                  >
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                    <span className="truncate flex-1">{folderPath}</span>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folderPath ? null : folderPath); }}
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                      </svg>
                    </button>
                  </Link>
                )}
                {folderMenuOpen === folderPath && (
                  <div ref={folderMenuRef} className="absolute right-2 top-full mt-0.5 py-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[110px]">
                    <button
                      onClick={() => { setRenamingFolder(folderPath); setRenameValue(folderPath); setFolderMenuOpen(null); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folderPath)}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Folders</span>
            <button
              onClick={() => setCreatingFolder(true)}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors"
              title="Create folder"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          {creatingFolder && (
            <form onSubmit={handleCreateFolder} className="flex gap-1">
              <input
                ref={newFolderInputRef}
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400"
                onKeyDown={(e) => { if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); } }}
              />
              <button type="submit" className="px-2 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                Add
              </button>
            </form>
          )}
        </div>
      )}

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
      <div className="px-3 pb-3 pt-2 border-t border-slate-100 space-y-px">
        <Link
          href="/mail/organization"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Organizations
        </Link>
        <Link
          href="/mail/settings"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </Link>
        <Link
          href="/admin"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Admin
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all text-left"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>

      {composeOpen && (
        <ComposeWindow onClose={() => setComposeOpen(false)} defaultMailbox={mailbox} />
      )}
    </div>
  );
}

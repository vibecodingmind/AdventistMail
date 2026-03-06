'use client';

import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  {
    id: 'mail',
    href: '/mail',
    title: 'Mail',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    href: '/mail/tasks',
    title: 'Tasks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'contacts',
    href: '/mail/contacts',
    title: 'Contacts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    href: '/mail/calendar',
    title: 'Calendar',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    href: '/mail/analytics',
    title: 'Analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'video',
    href: '/mail/video',
    title: 'Video',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export function IconNavBar() {
  const pathname = usePathname();
  const router = useRouter();

  function getInitials() {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) return 'U';
    } catch {}
    return 'U';
  }

  return (
    <div className="w-[62px] flex flex-col items-center py-4 bg-white border-r border-slate-100 shrink-0">
      {/* Logo */}
      <div className="mb-6 flex items-center justify-center">
        <div className="relative w-9 h-9">
          <div className="absolute inset-0 flex items-end justify-start">
            <div className="w-0 h-0 border-l-[18px] border-l-transparent border-b-[30px] border-b-emerald-500" />
          </div>
          <div className="absolute inset-0 flex items-start justify-end">
            <div className="w-0 h-0 border-r-[18px] border-r-transparent border-t-[30px] border-t-orange-400" />
          </div>
        </div>
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map((item) => {
          const isMail = item.id === 'mail';
          const isActive = isMail
            ? pathname === '/mail' || pathname === '/mail/'
            : pathname.startsWith(item.href);
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              title={item.title}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.icon}
            </button>
          );
        })}
      </nav>

      {/* User avatar */}
      <button className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center hover:ring-2 hover:ring-emerald-300 transition-all">
        {getInitials()}
      </button>
    </div>
  );
}

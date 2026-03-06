'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  pendingVerification: number;
  adminCount: number;
  activityToday: number;
  activeSessions: number;
}

interface ActivityLog {
  id: string;
  user_email: string | null;
  action: string;
  resource_type: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-emerald-500/15 text-emerald-400',
  logout: 'bg-slate-500/15 text-slate-400',
  create: 'bg-blue-500/15 text-blue-400',
  update: 'bg-amber-500/15 text-amber-400',
  delete: 'bg-red-500/15 text-red-400',
  email_sent: 'bg-purple-500/15 text-purple-400',
  user_created: 'bg-blue-500/15 text-blue-400',
  user_disabled: 'bg-red-500/15 text-red-400',
  user_enabled: 'bg-emerald-500/15 text-emerald-400',
  user_verified: 'bg-teal-500/15 text-teal-400',
  role_assigned: 'bg-indigo-500/15 text-indigo-400',
  password_reset: 'bg-amber-500/15 text-amber-400',
};

function actionColor(action: string) {
  return ACTION_COLORS[action] || 'bg-white/10 text-white/50';
}

function describeActivity(log: ActivityLog): string {
  const m = log.metadata || {};
  switch (log.action) {
    case 'login':
      return `Signed in${m.provider ? ` via ${m.provider}` : ''}`;
    case 'logout':
      return 'Signed out';
    case 'email_sent': {
      const to = Array.isArray(m.to) ? (m.to as string[]).join(', ') : String(m.to || '');
      const subject = m.subject ? `"${m.subject}"` : '(no subject)';
      return `Sent email to ${to} — ${subject}`;
    }
    case 'user_created':
      return `Created account: ${m.email || ''}`;
    case 'user_disabled':
      return `Disabled account: ${m.email || m.target_email || ''}`;
    case 'user_enabled':
      return `Re-enabled account: ${m.email || m.target_email || ''}`;
    case 'user_verified':
      return `Verified account: ${m.email || m.target_email || ''}`;
    case 'role_assigned':
      return `Changed role to "${m.role || m.new_role || ''}" for ${m.email || m.target_email || ''}`;
    case 'password_reset':
      return `Reset password${m.email ? ` for ${m.email}` : ''}`;
    default:
      return Object.keys(m).length > 0
        ? Object.entries(m).map(([k, v]) => `${k}: ${v}`).join(' · ')
        : log.resource_type || '';
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-white/40 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Stats>('/superadmin/stats'),
      api<{ logs: ActivityLog[] }>('/superadmin/activity?limit=20'),
    ]).then(([s, a]) => {
      setStats(s);
      setActivity(a.logs);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">System Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">Overview of all activities and system health</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-white/40">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading…
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            <StatCard
              label="Total Users"
              value={stats?.totalUsers ?? 0}
              color="bg-emerald-500/15 text-emerald-400"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <StatCard
              label="Active Users"
              value={stats?.activeUsers ?? 0}
              color="bg-blue-500/15 text-blue-400"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <StatCard
              label="Pending Verification"
              value={stats?.pendingVerification ?? 0}
              color="bg-amber-500/15 text-amber-400"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              label="Admin Accounts"
              value={stats?.adminCount ?? 0}
              color="bg-purple-500/15 text-purple-400"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
            />
            <StatCard
              label="Activity Today"
              value={stats?.activityToday ?? 0}
              color="bg-indigo-500/15 text-indigo-400"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
            <StatCard
              label="Active Sessions"
              value={stats?.activeSessions ?? 0}
              color="bg-teal-500/15 text-teal-400"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            />
          </div>

          {/* Recent activity */}
          <div className="bg-white/4 border border-white/8 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
              <span className="text-xs text-white/30">Last 20 events</span>
            </div>
            <div className="divide-y divide-white/5">
              {activity.length === 0 && (
                <p className="px-5 py-6 text-sm text-white/30 text-center">No activity yet</p>
              )}
              {activity.map((log) => (
                <div key={log.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-white/3 transition-colors">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${actionColor(log.action)}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/75 truncate">
                      {log.user_email
                        ? <span className="font-medium text-white/90">{log.user_email}</span>
                        : <span className="text-white/30 italic">system</span>}
                    </p>
                    {describeActivity(log) && (
                      <p className="text-xs text-white/40 mt-0.5 truncate">{describeActivity(log)}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-white/30">{timeAgo(log.created_at)}</p>
                    {log.ip_address && <p className="text-[10px] text-white/20 font-mono mt-0.5">{log.ip_address}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

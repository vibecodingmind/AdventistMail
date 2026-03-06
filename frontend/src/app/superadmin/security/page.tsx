'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Log {
  id: string;
  user_email: string | null;
  action: string;
  resource_type: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface Session {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  expires_at: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-emerald-500/15 text-emerald-400',
  logout: 'bg-slate-500/15 text-slate-400',
  create: 'bg-blue-500/15 text-blue-400',
  update: 'bg-amber-500/15 text-amber-400',
  delete: 'bg-red-500/15 text-red-400',
  send: 'bg-purple-500/15 text-purple-400',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString();
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

export default function SecurityPage() {
  const [tab, setTab] = useState<'audit' | 'sessions'>('audit');
  const [logs, setLogs] = useState<Log[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    if (tab === 'audit') {
      const params = new URLSearchParams({ limit: '100' });
      if (actionFilter) params.set('action', actionFilter);
      api<{ logs: Log[]; total: number }>(`/superadmin/activity?${params}`)
        .then((d) => { setLogs(d.logs); setLogTotal(d.total); })
        .finally(() => setLoading(false));
    } else {
      api<{ sessions: Session[] }>('/superadmin/sessions')
        .then((d) => setSessions(d.sessions))
        .finally(() => setLoading(false));
    }
  }, [tab, actionFilter]);

  async function revokeSession(userId: string) {
    await api(`/superadmin/sessions/${userId}`, { method: 'DELETE' });
    toast.success('Sessions revoked');
    setSessions((prev) => prev.filter((s) => s.user_id !== userId));
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Security</h1>
        <p className="text-sm text-white/40 mt-1">Audit logs and active sessions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-lg w-fit">
        {(['audit', 'sessions'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
          >
            {t === 'audit' ? `Audit Log ${logTotal > 0 ? `(${logTotal})` : ''}` : `Active Sessions ${sessions.length > 0 ? `(${sessions.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'audit' && (
        <>
          <div className="flex gap-3 mb-4">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none appearance-none"
            >
              <option value="">All actions</option>
              {['login', 'logout', 'create', 'update', 'delete', 'send'].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="bg-white/4 border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Action</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">User</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Resource</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">IP</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading && <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">Loading…</td></tr>}
                {!loading && logs.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">No logs found</td></tr>}
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-white/10 text-white/50'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-white/60">{log.user_email || <span className="text-white/25 italic">system</span>}</td>
                    <td className="px-5 py-3 text-xs text-white/40">{log.resource_type || '—'}</td>
                    <td className="px-5 py-3 text-xs text-white/30 font-mono">{log.ip_address || '—'}</td>
                    <td className="px-5 py-3 text-xs text-white/30">{timeAgo(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'sessions' && (
        <div className="bg-white/4 border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">User</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Started</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Expires</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">Loading…</td></tr>}
              {!loading && sessions.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30">No active sessions</td></tr>}
              {sessions.map((s) => (
                <tr key={`${s.user_id}-${s.created_at}`} className="hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-white/70 text-sm">{s.display_name || s.email}</p>
                    <p className="text-xs text-white/30">{s.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-white/50 bg-white/8 px-2 py-0.5 rounded-full">{s.role}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-white/40">{timeAgo(s.created_at)}</td>
                  <td className="px-5 py-3 text-xs text-white/30">{fmt(s.expires_at)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => revokeSession(s.user_id)}
                      className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  google_id: string | null;
  created_at: string;
  last_login: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  admin: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  user: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const data = await api<{ users: User[]; total: number }>(`/superadmin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  async function updateUser(id: string, patch: Partial<{ role: string; is_active: boolean; is_verified: boolean }>) {
    await api(`/superadmin/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    toast.success('User updated');
    load();
    if (selected?.id === id) setSelected(null);
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete this user permanently?')) return;
    setDeleting(id);
    try {
      await api(`/superadmin/users/${id}`, { method: 'DELETE' });
      toast.success('User deleted');
      load();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-white/40 mt-1">{total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-400/50 transition-colors"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-400/50 appearance-none transition-colors"
        >
          <option value="">All roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white/4 border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">User</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Role</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Last Login</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30 text-sm">Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-white/30 text-sm">No users found</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/3 transition-colors">
                <td className="px-5 py-3">
                  <div>
                    <p className="text-white/80 font-medium">{u.display_name || '—'}</p>
                    <p className="text-xs text-white/35 mt-0.5">{u.email}</p>
                    {u.google_id && <span className="text-[10px] text-blue-400/70">Google</span>}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border-none focus:outline-none cursor-pointer ${ROLE_COLORS[u.role] || 'bg-white/10 text-white/50'}`}
                    style={{ background: 'transparent' }}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                      className={`text-xs px-2 py-0.5 rounded-full w-fit transition-colors ${u.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                    {!u.is_verified && (
                      <button
                        onClick={() => updateUser(u.id, { is_verified: true })}
                        className="text-xs px-2 py-0.5 rounded-full w-fit bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
                      >
                        Verify now
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-xs text-white/35">{timeAgo(u.last_login)}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => deleteUser(u.id)}
                    disabled={deleting === u.id}
                    className="text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {deleting === u.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

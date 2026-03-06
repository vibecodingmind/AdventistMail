'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  is_verified?: boolean;
}

export default function AdminUsersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState('user');

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api<{ users: User[] }>('/users'),
  });

  const createMutation = useMutation({
    mutationFn: (body: { email: string; password: string; displayName?: string; role: string }) =>
      api('/users', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
      toast.success('User created');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api(`/users/${id}/verify`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User verified');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => api(`/users/${id}/disable`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User disabled');
    },
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => api(`/users/${id}/enable`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User enabled');
    },
  });

  const users = data?.users ?? [];
  const pendingUsers = users.filter((u) => !u.is_verified);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <Link href="/admin" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
          Back to Admin
        </Link>
        <h1 className="text-xl font-semibold mt-2 text-slate-800 dark:text-slate-100">Manage Users</h1>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        {pendingUsers.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
              {pendingUsers.length} pending verification
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              These users signed up and are waiting for admin approval.
            </p>
          </div>
        )}

        <button
          onClick={() => setShowCreate(true)}
          className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Create User
        </button>

        {showCreate && (
          <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700">
            <h3 className="font-medium mb-3 text-slate-800 dark:text-slate-100">Create User</h3>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              />
              <input
                type="password"
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              />
              <input
                type="text"
                placeholder="Display Name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() =>
                  createMutation.mutate({
                    email: newEmail,
                    password: newPassword,
                    displayName: newDisplayName || undefined,
                    role: newRole,
                  })
                }
                disabled={!newEmail || !newPassword || createMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Email</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Role</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{u.email}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{u.role}</td>
                  <td className="px-4 py-2">
                    {!u.is_verified ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                        Pending verification
                      </span>
                    ) : u.is_active ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    {!u.is_verified && (
                      <button
                        onClick={() => verifyMutation.mutate(u.id)}
                        disabled={verifyMutation.isPending}
                        className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline font-medium"
                      >
                        Verify
                      </button>
                    )}
                    {u.is_verified && u.is_active && (
                      <button
                        onClick={() => disableMutation.mutate(u.id)}
                        className="text-red-600 dark:text-red-400 text-sm hover:underline"
                      >
                        Disable
                      </button>
                    )}
                    {u.is_verified && !u.is_active && (
                      <button
                        onClick={() => enableMutation.mutate(u.id)}
                        className="text-emerald-600 dark:text-emerald-400 text-sm hover:underline"
                      >
                        Enable
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <Link href="/admin" className="text-blue-600 hover:text-blue-700">
          Back to Admin
        </Link>
        <h1 className="text-xl font-semibold mt-2">Manage Users</h1>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => setShowCreate(true)}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create User
        </button>

        {showCreate && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h3 className="font-medium mb-3">Create User</h3>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="password"
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Display Name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border rounded"
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
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Email</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Role</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.role}</td>
                  <td className="px-4 py-2">{u.is_active ? 'Active' : 'Disabled'}</td>
                  <td className="px-4 py-2">
                    {u.is_active ? (
                      <button
                        onClick={() => disableMutation.mutate(u.id)}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        onClick={() => enableMutation.mutate(u.id)}
                        className="text-green-600 text-sm hover:underline"
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

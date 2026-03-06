'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Mailbox {
  id: string;
  email: string;
  type: string;
  display_name: string | null;
}

export default function AdminMailboxesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');

  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['shared-mailboxes'],
    queryFn: () => api<{ mailboxes: Mailbox[] }>('/mailboxes/shared'),
  });

  const createMutation = useMutation({
    mutationFn: (body: { email: string; displayName?: string }) =>
      api('/mailboxes', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-mailboxes'] });
      setShowCreate(false);
      setNewEmail('');
      setNewDisplayName('');
      toast.success('Mailbox created');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  const mailboxes = data?.mailboxes ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <Link href="/admin" className="text-blue-600 hover:text-blue-700">
          Back to Admin
        </Link>
        <h1 className="text-xl font-semibold mt-2">Manage Shared Mailboxes</h1>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => setShowCreate(true)}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Shared Mailbox
        </button>

        {showCreate && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h3 className="font-medium mb-3">Create Shared Mailbox</h3>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="Email (e.g. it@church.org)"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Display Name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() =>
                  createMutation.mutate({
                    email: newEmail,
                    displayName: newDisplayName || undefined,
                  })
                }
                disabled={!newEmail || createMutation.isPending}
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
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Display Name</th>
              </tr>
            </thead>
            <tbody>
              {mailboxes.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2">{m.email}</td>
                  <td className="px-4 py-2">{m.display_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

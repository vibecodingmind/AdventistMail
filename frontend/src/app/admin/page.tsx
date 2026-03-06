'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Stats {
  usersCount: number;
  mailboxesCount: number;
  activeUsersCount: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api<Stats>('/admin/stats'),
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/mail" className="text-blue-600 hover:text-blue-700">
            Back to Mail
          </Link>
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold">{stats?.usersCount ?? 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold">{stats?.activeUsersCount ?? 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Mailboxes</p>
              <p className="text-2xl font-semibold">{stats?.mailboxesCount ?? 0}</p>
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold">Management</h2>
          </div>
          <div className="p-4 space-y-2">
            <Link
              href="/admin/users"
              className="block p-3 rounded hover:bg-gray-50 text-blue-600"
            >
              Manage Users
            </Link>
            <Link
              href="/admin/mailboxes"
              className="block p-3 rounded hover:bg-gray-50 text-blue-600"
            >
              Manage Shared Mailboxes
            </Link>
            <Link
              href="/admin/audit"
              className="block p-3 rounded hover:bg-gray-50 text-blue-600"
            >
              Audit Logs
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

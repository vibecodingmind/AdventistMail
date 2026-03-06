'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';

interface AuditLog {
  id: string;
  action: string;
  user_email?: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function AdminAuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api<{ logs: AuditLog[] }>('/admin/audit-logs?limit=100'),
  });

  const logs = data?.logs ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <Link href="/admin" className="text-blue-600 hover:text-blue-700">
          Back to Admin
        </Link>
        <h1 className="text-xl font-semibold mt-2">Audit Logs</h1>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Time</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">User</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Action</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Resource</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-2 text-sm">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm">{log.user_email || '-'}</td>
                  <td className="px-4 py-2 text-sm">{log.action}</td>
                  <td className="px-4 py-2 text-sm">
                    {log.resource_type} {log.resource_id ? `#${log.resource_id.slice(0, 8)}` : ''}
                  </td>
                  <td className="px-4 py-2 text-sm">{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

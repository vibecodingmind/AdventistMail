'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Stats {
  usersCount: number;
  mailboxesCount: number;
  activeUsersCount: number;
}

interface EmailRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  requested_email: string;
  church_name: string | null;
  purpose: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
}

const statusColors = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-600 border-red-200',
};

function EmailRequestsTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-email-requests', filter],
    queryFn: () => {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      return api<{ requests: EmailRequest[] }>(`/email-requests${params}`);
    },
  });

  const requests = data?.requests ?? [];
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      api(`/email-requests/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ adminNote: note }),
      }),
    onSuccess: () => {
      toast.success('Request approved — mailbox created and access granted');
      queryClient.invalidateQueries({ queryKey: ['admin-email-requests'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      api(`/email-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ adminNote: note }),
      }),
    onSuccess: () => {
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-email-requests'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to reject'),
  });

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-slate-200 pb-0">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              filter === f
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {f}
            {f === 'pending' && pendingCount > 0 && filter !== 'pending' && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-slate-400">No {filter !== 'all' ? filter : ''} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Requester */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {(r.user_name || r.user_email).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-800">{r.user_name || r.user_email}</span>
                      <span className="text-xs text-slate-400 ml-2">{r.user_email}</span>
                    </div>
                  </div>
                  {/* Request details */}
                  <div className="ml-9 space-y-0.5">
                    <p className="text-sm font-semibold text-slate-800">
                      Requesting: <span className="text-emerald-600">{r.requested_email}</span>
                    </p>
                    {r.church_name && <p className="text-xs text-slate-500">Church: {r.church_name}</p>}
                    {r.purpose && <p className="text-xs text-slate-500">Purpose: {r.purpose}</p>}
                    {r.admin_note && (
                      <p className="text-xs text-slate-500 italic mt-1">Note: {r.admin_note}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColors[r.status]}`}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>

                  {r.status === 'pending' && (
                    <div className="flex flex-col gap-2 items-end">
                      <textarea
                        value={noteInputs[r.id] || ''}
                        onChange={(e) => setNoteInputs((p) => ({ ...p, [r.id]: e.target.value }))}
                        placeholder="Admin note (optional)"
                        rows={2}
                        className="w-52 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => rejectMutation.mutate({ id: r.id, note: noteInputs[r.id] })}
                          disabled={rejectMutation.isPending}
                          className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => approveMutation.mutate({ id: r.id, note: noteInputs[r.id] })}
                          disabled={approveMutation.isPending}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface OrgRequest {
  id: string;
  name: string;
  type: string;
  requested_email: string;
  owner_email: string;
  created_at: string;
}

interface OrgEmailRequest {
  id: string;
  org_name: string;
  requested_email: string;
  requested_by_email: string;
  created_at: string;
}

function OrgRequestsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-org-requests'],
    queryFn: () => api<{ requests: OrgRequest[] }>('/admin/organization-requests'),
  });

  const mutate = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      api(`/admin/organization-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      toast.success('Updated');
      queryClient.invalidateQueries({ queryKey: ['admin-org-requests'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  const requests = data?.requests ?? [];

  if (isLoading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (requests.length === 0) return <p className="text-sm text-slate-400">No pending organization requests</p>;

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800">{r.name}</p>
            <p className="text-sm text-slate-500">{r.type} · {r.requested_email}</p>
            <p className="text-xs text-slate-400 mt-1">Owner: {r.owner_email} · {new Date(r.created_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => mutate.mutate({ id: r.id, action: 'reject' })} disabled={mutate.isPending} className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50">Reject</button>
            <button onClick={() => mutate.mutate({ id: r.id, action: 'approve' })} disabled={mutate.isPending} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50">Approve</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrgEmailRequestsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-org-email-requests'],
    queryFn: () => api<{ requests: OrgEmailRequest[] }>('/admin/organization-email-requests'),
  });

  const mutate = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      api(`/admin/organization-email-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      toast.success('Updated');
      queryClient.invalidateQueries({ queryKey: ['admin-org-email-requests'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
  });

  const requests = data?.requests ?? [];

  if (isLoading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (requests.length === 0) return <p className="text-sm text-slate-400">No pending org official email requests</p>;

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800">{r.org_name}</p>
            <p className="text-sm text-slate-500">Requesting: {r.requested_email}</p>
            <p className="text-xs text-slate-400 mt-1">By: {r.requested_by_email} · {new Date(r.created_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => mutate.mutate({ id: r.id, action: 'reject' })} disabled={mutate.isPending} className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50">Reject</button>
            <button onClick={() => mutate.mutate({ id: r.id, action: 'approve' })} disabled={mutate.isPending} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50">Approve</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'email-requests' | 'org-requests' | 'org-email-requests'>('overview');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api<Stats>('/admin/stats'),
  });

  const { data: pendingEmailReqs } = useQuery({
    queryKey: ['admin-email-requests', 'pending'],
    queryFn: () => api<{ requests: EmailRequest[] }>('/email-requests?status=pending'),
  });
  const { data: orgReqs } = useQuery({
    queryKey: ['admin-org-requests'],
    queryFn: () => api<{ requests: OrgRequest[] }>('/admin/organization-requests'),
  });
  const { data: orgEmailReqs } = useQuery({
    queryKey: ['admin-org-email-requests'],
    queryFn: () => api<{ requests: OrgEmailRequest[] }>('/admin/organization-email-requests'),
  });
  const pendingCount = (pendingEmailReqs?.requests ?? []).length;
  const orgPendingCount = (orgReqs?.requests ?? []).length;
  const orgEmailPendingCount = (orgEmailReqs?.requests ?? []).length;

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/mail" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Mail
            </Link>
            <div className="w-px h-5 bg-slate-200" />
            <h1 className="text-base font-semibold text-slate-800">Admin Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-slate-200 pb-0">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'email-requests', label: 'Email Requests', badge: pendingCount },
            { id: 'org-requests', label: 'Org Requests', badge: orgPendingCount },
            { id: 'org-email-requests', label: 'Org Email Requests', badge: orgEmailPendingCount },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === t.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            {isLoading ? (
              <p className="text-slate-400">Loading…</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <p className="text-sm text-slate-500">Total Users</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stats?.usersCount ?? 0}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <p className="text-sm text-slate-500">Active Users</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stats?.activeUsersCount ?? 0}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <p className="text-sm text-slate-500">Mailboxes</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stats?.mailboxesCount ?? 0}</p>
                </div>
              </div>
            )}

            {pendingCount > 0 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-amber-800">
                    {pendingCount} pending email request{pendingCount !== 1 ? 's' : ''} awaiting review
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('email-requests')}
                  className="text-sm text-amber-700 font-medium hover:underline"
                >
                  Review →
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Management</h2>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { href: '/admin/users', label: 'Manage Users', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                  { href: '/admin/mailboxes', label: 'Manage Shared Mailboxes', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                  { href: '/admin/audit', label: 'Audit Logs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                ].map(({ href, label, icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={icon} />
                    </svg>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'email-requests' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Email Address Requests</h2>
            <EmailRequestsTab />
          </div>
        )}

        {activeTab === 'org-requests' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Organization Requests</h2>
            <OrgRequestsTab />
          </div>
        )}

        {activeTab === 'org-email-requests' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Organization Official Email Requests</h2>
            <OrgEmailRequestsTab />
          </div>
        )}
      </main>
    </div>
  );
}

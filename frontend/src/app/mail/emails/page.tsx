'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Mailbox {
  id: string;
  email: string;
  type: string;
  display_name: string | null;
  can_send_as: boolean;
}

interface EmailRequest {
  id: string;
  requested_email: string;
  church_name: string | null;
  purpose: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
}

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
};

const statusLabels = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function ManageEmailsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [reqEmail, setReqEmail] = useState('');
  const [churchName, setChurchName] = useState('');
  const [purpose, setPurpose] = useState('');

  const { data: mailboxData } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api<{ mailboxes: Mailbox[] }>('/mailboxes'),
  });

  const { data: requestsData, isLoading: reqLoading } = useQuery({
    queryKey: ['email-requests-mine'],
    queryFn: () => api<{ requests: EmailRequest[] }>('/email-requests/mine'),
  });

  const assignedEmails = (mailboxData?.mailboxes ?? []).filter((m) => m.can_send_as && m.type !== 'personal');
  const personalEmail = (mailboxData?.mailboxes ?? []).find((m) => m.type === 'personal');
  const requests = requestsData?.requests ?? [];

  const submitMutation = useMutation({
    mutationFn: () =>
      api('/email-requests', {
        method: 'POST',
        body: JSON.stringify({ requestedEmail: reqEmail, churchName, purpose }),
      }),
    onSuccess: () => {
      toast.success('Request submitted! An admin will review it shortly.');
      setShowForm(false);
      setReqEmail(''); setChurchName(''); setPurpose('');
      queryClient.invalidateQueries({ queryKey: ['email-requests-mine'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to submit request'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reqEmail.trim()) { toast.error('Email address is required'); return; }
    submitMutation.mutate();
  }

  return (
    <div className="flex-1 bg-white overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Manage Email Addresses</h1>
            <p className="text-sm text-slate-500 mt-0.5">View your assigned sending identities and request new church emails</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Request Address
          </button>
        </div>

        {/* Request form */}
        {showForm && (
          <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Request a New Email Address</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email address you want *</label>
                <input
                  type="email"
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  placeholder="pastor@maranatha-church.org"
                  required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Church / Organization name</label>
                <input
                  type="text"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="Maranatha Seventh-day Adventist Church"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Purpose / Role</label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Pastor communications, church secretary, Sabbath School department"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white resize-none"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-slate-400">An admin will review and approve your request.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {submitMutation.isPending ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Personal email */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Login Account</h2>
          <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{personalEmail?.email || '—'}</p>
              <p className="text-xs text-slate-400">Personal login email</p>
            </div>
            <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full">Personal</span>
          </div>
        </div>

        {/* Assigned church emails */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Assigned Church Emails ({assignedEmails.length})
          </h2>
          {assignedEmails.length === 0 ? (
            <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
              <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-slate-400">No church emails assigned yet.</p>
              <p className="text-xs text-slate-400 mt-1">Request one using the button above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedEmails.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.email}</p>
                    {m.display_name && <p className="text-xs text-slate-400">{m.display_name}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    {m.can_send_as && (
                      <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full">Send as</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Requests history */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Email Requests ({requests.length})
          </h2>
          {reqLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-400">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="p-4 border border-slate-100 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.requested_email}</p>
                      {r.church_name && <p className="text-xs text-slate-500 mt-0.5">{r.church_name}</p>}
                      {r.purpose && <p className="text-xs text-slate-400 mt-0.5">{r.purpose}</p>}
                      {r.admin_note && (
                        <p className="text-xs text-slate-500 mt-1.5 italic">Admin note: {r.admin_note}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[r.status]}`}>
                        {statusLabels[r.status]}
                      </span>
                      <p className="text-xs text-slate-400 mt-1 text-right">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

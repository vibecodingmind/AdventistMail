'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Organization {
  id: string;
  name: string;
  type: string;
  requested_email: string;
  role: string;
  membership_status: string;
  logo_url?: string | null;
  primary_color?: string | null;
}

interface Member {
  id: string;
  email: string;
  display_name?: string;
  role: string;
  status: string;
}

interface OfficialEmail {
  id: string;
  requested_email: string;
  status: string;
  mailbox_id: string | null;
}

const typeLabels: Record<string, string> = {
  church: 'Church',
  ministries: 'Ministries',
  institutions: 'Institutions',
  unions: 'Unions',
};

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'members' | 'emails' | 'branding'>('members');

  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#047857');
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [newOfficialEmail, setNewOfficialEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api<{ organizations: Organization[] }>('/organizations'),
  });

  const org = orgsData?.organizations?.find((o) => o.id === id);

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['org-members', id],
    queryFn: () => api<{ members: Member[] }>(`/organizations/${id}/members`),
    enabled: !!id && org?.role === 'org_admin',
  });

  const { data: emailsData, isLoading: emailsLoading } = useQuery({
    queryKey: ['org-official-emails', id],
    queryFn: () => api<{ officialEmails: OfficialEmail[] }>(`/organizations/${id}/official-emails`),
    enabled: !!id,
  });

  const members = membersData?.members ?? [];
  const officialEmails = emailsData?.officialEmails ?? [];
  const isAdmin = org?.role === 'org_admin';

  useEffect(() => {
    if (org?.logo_url !== undefined) setLogoUrl(org.logo_url || '');
    if (org?.primary_color) setPrimaryColor(org.primary_color);
  }, [org?.logo_url, org?.primary_color]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const res = await api<{ success: boolean; inviteLink?: string }>(`/organizations/${id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase() }),
      });
      if (res.inviteLink) {
        await navigator.clipboard.writeText(res.inviteLink);
        toast.success('Invite link copied to clipboard');
      } else {
        toast.success('Invite sent');
      }
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['org-members', id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAddLoading(true);
    try {
      await api(`/organizations/${id}/add-member`, {
        method: 'POST',
        body: JSON.stringify({ email: addEmail.trim().toLowerCase() }),
      });
      toast.success('Member added');
      setAddEmail('');
      queryClient.invalidateQueries({ queryKey: ['org-members', id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setBrandingLoading(true);
    try {
      await api(`/organizations/${id}/branding`, {
        method: 'PATCH',
        body: JSON.stringify({ logo_url: logoUrl.trim() || null, primary_color: primaryColor }),
      });
      toast.success('Branding updated');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBrandingLoading(false);
    }
  }

  async function handleRequestOfficialEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newOfficialEmail.trim()) return;
    setEmailLoading(true);
    try {
      await api(`/organizations/${id}/request-official-email`, {
        method: 'POST',
        body: JSON.stringify({ requestedEmail: newOfficialEmail.trim().toLowerCase() }),
      });
      toast.success('Request submitted. Admin will approve it.');
      setNewOfficialEmail('');
      queryClient.invalidateQueries({ queryKey: ['org-official-emails', id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to request');
    } finally {
      setEmailLoading(false);
    }
  }

  if (!org) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[#F5F6FA]">
        <p className="text-slate-500">Organization not found</p>
        <Link href="/mail/organization" className="mt-4 text-emerald-600 hover:underline">Back to organizations</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      <div className="p-6 border-b border-slate-200 bg-white">
        <Link href="/mail/organization" className="text-sm text-emerald-600 hover:underline mb-2 inline-block">
          ← Back to organizations
        </Link>
        <h1 className="text-xl font-bold text-slate-800">{org.name}</h1>
        <p className="text-sm text-slate-500">
          {typeLabels[org.type] || org.type} · {org.requested_email}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${isAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {isAdmin ? 'Admin' : 'Member'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
          <button
            onClick={() => setTab('members')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'members' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Members
          </button>
          <button
            onClick={() => setTab('emails')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'emails' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Official Emails
          </button>
          {isAdmin && (
            <button
              onClick={() => setTab('branding')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'branding' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Branding
            </button>
          )}
        </div>

        {tab === 'members' && (
          <div className="space-y-6">
            {isAdmin && (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="font-medium text-slate-800 mb-3">Invite by email</h3>
                  <form onSubmit={handleInvite} className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <button type="submit" disabled={inviteLoading} className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                      {inviteLoading ? 'Sending…' : 'Invite'}
                    </button>
                  </form>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="font-medium text-slate-800 mb-3">Add existing user</h3>
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <input
                      type="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <button type="submit" disabled={addLoading} className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                      {addLoading ? 'Adding…' : 'Add'}
                    </button>
                  </form>
                </div>
              </>
            )}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <h3 className="font-medium text-slate-800 p-4 border-b border-slate-100">Members</h3>
              {membersLoading ? (
                <div className="p-8 text-center text-slate-500">Loading…</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="border-b border-slate-50 last:border-0">
                        <td className="p-4 text-sm">{m.email}</td>
                        <td className="p-4"><span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'org_admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{m.role === 'org_admin' ? 'Admin' : 'Member'}</span></td>
                        <td className="p-4 text-sm text-slate-500">{m.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'branding' && isAdmin && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 max-w-lg">
              <h3 className="font-medium text-slate-800 mb-4">Organization branding</h3>
              <form onSubmit={handleSaveBranding} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Logo URL</label>
                  <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Primary color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                    <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" />
                  </div>
                </div>
                <button type="submit" disabled={brandingLoading} className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {brandingLoading ? 'Saving…' : 'Save branding'}
                </button>
              </form>
            </div>
          </div>
        )}

        {tab === 'emails' && (
          <div className="space-y-6">
            {isAdmin && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-medium text-slate-800 mb-3">Request new official email</h3>
                <form onSubmit={handleRequestOfficialEmail} className="flex gap-2">
                  <input
                    type="email"
                    value={newOfficialEmail}
                    onChange={(e) => setNewOfficialEmail(e.target.value)}
                    placeholder="info@church.org"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <button type="submit" disabled={emailLoading} className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                    {emailLoading ? 'Requesting…' : 'Request'}
                  </button>
                </form>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <h3 className="font-medium text-slate-800 p-4 border-b border-slate-100">Official emails</h3>
              {emailsLoading ? (
                <div className="p-8 text-center text-slate-500">Loading…</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="p-4">Email</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officialEmails.length === 0 ? (
                      <tr><td colSpan={2} className="p-8 text-center text-slate-500">No official emails yet</td></tr>
                    ) : (
                      officialEmails.map((e) => (
                        <tr key={e.id} className="border-b border-slate-50 last:border-0">
                          <td className="p-4 text-sm">{e.requested_email}</td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              e.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              e.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                            }`}>
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

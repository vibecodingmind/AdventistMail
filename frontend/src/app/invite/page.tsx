'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }
    api<{ orgName: string; orgId: string }>(`/organizations/invite/${token}`)
      .then((data) => {
        setOrgName(data.orgName);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Invalid or expired invite');
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken && !loading && orgName) {
      const redirectUrl = `/invite?token=${encodeURIComponent(token || '')}`;
      router.replace(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  }, [loading, orgName, token, router]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      await api<{ success: boolean; orgId?: string }>('/organizations/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setAccepted(true);
      setTimeout(() => router.push('/mail/organization'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060D1B]">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !orgName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060D1B] p-4">
        <div className="max-w-md w-full bg-[#0E1829] rounded-2xl p-8 text-center">
          <p className="text-red-400">{error}</p>
          <Link href="/login" className="inline-block mt-4 text-emerald-400 hover:underline">Go to Sign In</Link>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060D1B] p-4">
        <div className="max-w-md w-full bg-[#0E1829] rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white font-medium">You've joined {orgName}!</p>
          <p className="text-white/50 text-sm mt-2">Redirecting to organizations…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060D1B] p-4">
      <div className="max-w-md w-full bg-[#0E1829] rounded-2xl p-8">
        <h1 className="text-xl font-bold text-white">Join organization</h1>
        <p className="text-white/60 text-sm mt-1">You've been invited to join</p>
        <p className="text-emerald-400 font-semibold mt-4 text-lg">{orgName}</p>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {accepting ? 'Joining…' : 'Accept invite'}
          </button>
          <Link
            href="/mail"
            className="px-4 py-3 border border-white/20 text-white/70 hover:text-white rounded-lg text-center"
          >
            Decline
          </Link>
        </div>
      </div>
    </div>
  );
}

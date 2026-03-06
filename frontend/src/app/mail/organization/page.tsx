'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  type: string;
  requested_email: string;
  role: string;
  membership_status: string;
  is_verified: boolean;
}

const typeLabels: Record<string, string> = {
  church: 'Church',
  ministries: 'Ministries',
  institutions: 'Institutions',
  unions: 'Unions',
};

export default function OrganizationListPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api<{ organizations: Organization[] }>('/organizations'),
  });

  const organizations = data?.organizations ?? [];

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      <div className="p-6 border-b border-slate-200 bg-white">
        <h1 className="text-xl font-bold text-slate-800">My Organizations</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your church, ministry, or institution</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-500">You are not a member of any organization.</p>
            <p className="text-sm text-slate-400 mt-2">Register as an organization from the signup page, or wait for an invite.</p>
            <Link href="/signup" className="inline-block mt-4 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600">
              Sign up as organization
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/mail/organization/${org.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors"
              >
                <div>
                  <h2 className="font-semibold text-slate-800">{org.name}</h2>
                  <p className="text-sm text-slate-500">
                    {typeLabels[org.type] || org.type} · {org.requested_email}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${org.role === 'org_admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {org.role === 'org_admin' ? 'Admin' : 'Member'}
                    </span>
                    {!org.is_verified && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending approval</span>
                    )}
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

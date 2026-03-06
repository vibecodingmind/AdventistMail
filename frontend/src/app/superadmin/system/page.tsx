'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface StorageRequest {
  id: string;
  user_email: string;
  user_display_name: string | null;
  current_plan_name: string | null;
  requested_plan_name: string;
  status: string;
  created_at: string;
}

interface SystemInfo {
  node: { version: string; platform: string; arch: string; uptime: number; uptimeFormatted: string };
  memory: { heapUsed: number; heapTotal: number; rss: number; systemTotal: number; systemFree: number; systemUsed: number };
  os: { hostname: string; cpus: number; loadAvg: number[] };
  database: { auditLogEntries: number; tables: { tablename: string; size: string }[] };
}

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function pct(used: number, total: number) {
  return total > 0 ? Math.round((used / total) * 100) : 0;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const p = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-xs text-white/70 font-mono">{value}</span>
    </div>
  );
}

export default function SystemPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageRequests, setStorageRequests] = useState<StorageRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    api<SystemInfo>('/superadmin/system')
      .then(setInfo)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api<{ requests: StorageRequest[] }>('/superadmin/storage-requests')
      .then((r) => setStorageRequests(r.requests))
      .catch(() => {});
  }, []);

  async function processRequest(id: string, status: 'approved' | 'rejected') {
    setProcessingId(id);
    try {
      await api(`/superadmin/storage-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success(status === 'approved' ? 'Upgrade approved' : 'Request rejected');
      setStorageRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-white/40">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading system info…
      </div>
    );
  }

  if (!info) return <div className="p-8 text-white/40">Failed to load system info</div>;

  const memPct = pct(info.memory.systemUsed, info.memory.systemTotal);
  const heapPct = pct(info.memory.heapUsed, info.memory.heapTotal);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">System</h1>
        <p className="text-sm text-white/40 mt-1">Server status, storage and runtime info</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Server / Runtime */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
            Runtime
          </h2>
          <InfoRow label="Node.js" value={info.node.version} />
          <InfoRow label="Platform" value={`${info.node.platform} / ${info.node.arch}`} />
          <InfoRow label="Hostname" value={info.os.hostname} />
          <InfoRow label="CPUs" value={`${info.os.cpus} cores`} />
          <InfoRow label="Uptime" value={info.node.uptimeFormatted} />
          <InfoRow label="Load avg (1m)" value={info.os.loadAvg[0].toFixed(2)} />
        </div>

        {/* Memory */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
            Memory
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/40">System Memory</span>
                <span className="text-white/60">{bytes(info.memory.systemUsed)} / {bytes(info.memory.systemTotal)} ({memPct}%)</span>
              </div>
              <Bar value={info.memory.systemUsed} max={info.memory.systemTotal} color={memPct > 80 ? 'bg-red-500' : memPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/40">Heap Used</span>
                <span className="text-white/60">{bytes(info.memory.heapUsed)} / {bytes(info.memory.heapTotal)} ({heapPct}%)</span>
              </div>
              <Bar value={info.memory.heapUsed} max={info.memory.heapTotal} color="bg-blue-500" />
            </div>
            <InfoRow label="RSS" value={bytes(info.memory.rss)} />
            <InfoRow label="Free System Memory" value={bytes(info.memory.systemFree)} />
          </div>
        </div>

        {/* Database */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4s8 1.79 8 4" />
            </svg>
            Database Storage
            <span className="ml-auto text-xs text-white/30 font-normal">{info.database.auditLogEntries.toLocaleString()} audit entries</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {info.database.tables.map((t) => (
              <div key={t.tablename} className="bg-white/4 border border-white/8 rounded-lg px-3 py-2.5">
                <p className="text-xs font-mono text-white/60 truncate">{t.tablename}</p>
                <p className="text-sm font-semibold text-white mt-0.5">{t.size}</p>
              </div>
            ))}
            {info.database.tables.length === 0 && (
              <p className="col-span-4 text-xs text-white/30 py-4">No table data available</p>
            )}
          </div>
        </div>

        {/* Storage Upgrade Requests */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Storage Upgrade Requests
          </h2>
          {storageRequests.length === 0 ? (
            <p className="text-xs text-white/30 py-4">No pending requests</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-0 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">User</th>
                  <th className="px-0 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Current → Requested</th>
                  <th className="px-0 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Date</th>
                  <th className="px-0 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {storageRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-white/3 transition-colors">
                    <td className="py-3">
                      <p className="text-white/80">{r.user_display_name || r.user_email}</p>
                      <p className="text-xs text-white/40">{r.user_email}</p>
                    </td>
                    <td className="py-3 text-white/60">
                      {r.current_plan_name || 'Free'} → {r.requested_plan_name}
                    </td>
                    <td className="py-3 text-xs text-white/40">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => processRequest(r.id, 'approved')}
                          disabled={processingId === r.id}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => processRequest(r.id, 'rejected')}
                          disabled={processingId === r.id}
                          className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

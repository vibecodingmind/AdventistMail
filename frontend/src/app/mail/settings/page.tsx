'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

/* ── helpers ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}
      style={{ height: '22px' }}
    >
      <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4.5' : ''}`}
        style={{ width: '18px', height: '18px', transform: checked ? 'translateX(18px)' : 'translateX(0)' }}
      />
    </button>
  );
}

function Radio({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={onChange}
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer ${checked ? 'border-emerald-500' : 'border-slate-300'}`}
      >
        {checked && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-8 py-5 border-b border-slate-100 last:border-0">
      <div className="w-56 shrink-0">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        {desc && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ══════════════════ SIGNATURES TAB ══════════════════ */
function SignaturesTab() {
  const [signatures, setSignatures] = useState<{ id: string; name: string; content: string; is_default: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDefault, setNewDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ signatures: { id: string; name: string; content: string; is_default: boolean }[] }>('/signatures')
      .then((d) => setSignatures(d.signatures))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const sig = await api<{ id: string; name: string; content: string; is_default: boolean }>('/signatures', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), content: newContent.trim(), isDefault: newDefault }),
      });
      setSignatures((s) => [...s, sig]);
      setNewName(''); setNewContent(''); setNewDefault(false);
      toast.success('Signature created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api(`/signatures/${id}`, { method: 'DELETE' });
      setSignatures((s) => s.filter((x) => x.id !== id));
      toast.success('Signature deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <Section title="Manage signatures" desc="Create and manage email signatures. Choose one when composing.">
        <form onSubmit={handleCreate} className="space-y-3">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Signature name" required
            className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
          <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Signature content..." rows={4} required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 resize-none" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={newDefault} onChange={(e) => setNewDefault(e.target.checked)} className="rounded text-emerald-500" />
            <span className="text-sm text-slate-700">Set as default</span>
          </label>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {saving ? 'Creating…' : 'Add signature'}
          </button>
        </form>
      </Section>
      <Section title="Your signatures">
        <div className="space-y-3">
          {signatures.length === 0 ? (
            <p className="text-sm text-slate-500">No signatures yet. Create one above.</p>
          ) : (
            signatures.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-4 p-4 border border-slate-200 rounded-xl">
                <div>
                  <p className="font-medium text-slate-800">{s.name} {s.is_default && <span className="text-xs text-emerald-600">(default)</span>}</p>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{s.content.slice(0, 100)}{s.content.length > 100 ? '…' : ''}</p>
                </div>
                <button onClick={() => handleDelete(s.id)} className="text-sm text-red-600 hover:underline">Delete</button>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}

/* ══════════════════ TEMPLATES TAB ══════════════════ */
function TemplatesTab() {
  const [templates, setTemplates] = useState<{ id: string; name: string; subject: string; body_html: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ templates: { id: string; name: string; subject: string; body_html: string }[] }>('/templates')
      .then((d) => setTemplates(d.templates))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newSubject.trim() || !newBody.trim()) return;
    setSaving(true);
    try {
      const t = await api<{ id: string; name: string; subject: string; body_html: string }>('/templates', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), subject: newSubject.trim(), body_html: newBody.trim() }),
      });
      setTemplates((prev) => [...prev, t]);
      setNewName(''); setNewSubject(''); setNewBody('');
      toast.success('Template created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api(`/templates/${id}`, { method: 'DELETE' });
      setTemplates((prev) => prev.filter((x) => x.id !== id));
      toast.success('Template deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <Section title="Email templates" desc="Create reusable templates for common emails. Insert them when composing.">
        <form onSubmit={handleCreate} className="space-y-3">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Template name" required
            className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
          <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Subject" required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
          <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Body (HTML supported)" rows={6} required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 resize-none" />
          <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {saving ? 'Creating…' : 'Add template'}
          </button>
        </form>
      </Section>
      <Section title="Your templates">
        <div className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-sm text-slate-500">No templates yet.</p>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-4 p-4 border border-slate-200 rounded-xl">
                <div>
                  <p className="font-medium text-slate-800">{t.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{t.subject}</p>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{t.body_html.replace(/<[^>]+>/g, '').slice(0, 120)}…</p>
                </div>
                <button onClick={() => handleDelete(t.id)} className="text-sm text-red-600 hover:underline shrink-0">Delete</button>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}

/* ══════════════════ FILTERS TAB ══════════════════ */
function FiltersTab() {
  const [rules, setRules] = useState<{ id: string; name: string; match_from: string | null; match_subject: string | null; action_move: string | null; action_mark_read: boolean; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMatchFrom, setNewMatchFrom] = useState('');
  const [newMatchSubject, setNewMatchSubject] = useState('');
  const [newActionMove, setNewActionMove] = useState('');
  const [newActionMarkRead, setNewActionMarkRead] = useState(false);

  useEffect(() => {
    api<{ rules: typeof rules }>('/filters').then((d) => setRules(d.rules)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api<{ id: string; name: string; match_from: string | null; match_subject: string | null; action_move: string | null; action_mark_read: boolean; is_active: boolean }>('/filters', {
        method: 'POST',
        body: JSON.stringify({ name: newName || 'New rule', match_from: newMatchFrom || undefined, match_subject: newMatchSubject || undefined, action_move: newActionMove || undefined, action_mark_read: newActionMarkRead }),
      });
      setRules((prev) => [...prev, r]);
      setNewName(''); setNewMatchFrom(''); setNewMatchSubject(''); setNewActionMove(''); setNewActionMarkRead(false);
      setShowForm(false);
      toast.success('Filter created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function deleteRule(id: string) {
    try {
      await api(`/filters/${id}`, { method: 'DELETE' });
      setRules((prev) => prev.filter((x) => x.id !== id));
      toast.success('Filter deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="max-w-3xl">
      <Section title="Filter rules" desc="Automatically label, move, or mark messages based on sender, subject, etc.">
        <div className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-sm text-slate-500">No filters. Create one to auto-organize incoming mail.</p>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div>
                  <p className="font-medium text-slate-800">{r.name} {!r.is_active && <span className="text-xs text-slate-400">(inactive)</span>}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {r.match_from ? `From: ${r.match_from}` : ''} {r.match_subject ? `Subject: ${r.match_subject}` : ''}
                    {r.action_move ? ` → Move to ${r.action_move}` : ''} {r.action_mark_read ? ' Mark read' : ''}
                  </p>
                </div>
                <button onClick={() => deleteRule(r.id)} className="text-sm text-red-600 hover:underline">Delete</button>
              </div>
            ))
          )}
        </div>
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="mt-3 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            + Create filter
          </button>
        ) : (
          <form onSubmit={createRule} className="mt-4 p-4 border border-slate-200 rounded-xl space-y-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Rule name" className="w-full px-3 py-2 border border-slate-300 rounded text-sm" />
            <input value={newMatchFrom} onChange={(e) => setNewMatchFrom(e.target.value)} placeholder="From contains (optional)" className="w-full px-3 py-2 border border-slate-300 rounded text-sm" />
            <input value={newMatchSubject} onChange={(e) => setNewMatchSubject(e.target.value)} placeholder="Subject contains (optional)" className="w-full px-3 py-2 border border-slate-300 rounded text-sm" />
            <input value={newActionMove} onChange={(e) => setNewActionMove(e.target.value)} placeholder="Move to folder (e.g. Trash) (optional)" className="w-full px-3 py-2 border border-slate-300 rounded text-sm" />
            <label className="flex items-center gap-2"><input type="checkbox" checked={newActionMarkRead} onChange={(e) => setNewActionMarkRead(e.target.checked)} /> Mark as read</label>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        )}
      </Section>
    </div>
  );
}

/* ══════════════════ SECURITY TAB ══════════════════ */
function SecurityTab() {
  const [sessions, setSessions] = useState<{ id: string; created_at: string; expires_at: string }[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; type: string; message: string; ip_address: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([
      api<{ sessions: { id: string; created_at: string; expires_at: string }[] }>('/auth/sessions'),
      api<{ alerts: { id: string; type: string; message: string; ip_address: string | null; created_at: string }[] }>('/auth/security-alerts'),
    ])
      .then(([s, a]) => {
        setSessions(s.sessions);
        setAlerts(a.alerts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function revoke(id: string) {
    try {
      await api(`/auth/sessions/${id}`, { method: 'DELETE' });
      setSessions((s) => s.filter((x) => x.id !== id));
      toast.success('Session revoked');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  const [exporting, setExporting] = useState(false);
  const [deletePass, setDeletePass] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/auth/export-data`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!r.ok) throw new Error('Export failed');
      const data = await r.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'adventist-mail-export.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Data exported');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePass) { toast.error('Enter your password'); return; }
    setDeleting(true);
    try {
      await api('/auth/delete-account', { method: 'POST', body: JSON.stringify({ password: deletePass }) });
      toast.success('Account deactivated. Logging out...');
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <Section title="Security alerts" desc="Recent sign-in activity and security events.">
        <div className="space-y-2 mb-4">
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500">No security alerts.</p>
          ) : (
            alerts.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <p className="text-sm text-slate-700">{a.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(a.created_at).toLocaleString()}{a.ip_address ? ` · ${a.ip_address}` : ''}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Section>
      <Section title="Active sessions" desc="Manage your active sessions. Revoking a session will log that device out.">
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-sm text-slate-500">No active sessions</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div>
                  <p className="text-sm text-slate-700">Session started {new Date(s.created_at).toLocaleString()}</p>
                  <p className="text-xs text-slate-400">Expires {new Date(s.expires_at).toLocaleString()}</p>
                </div>
                <button onClick={() => revoke(s.id)} className="text-sm text-red-600 hover:underline">Revoke</button>
              </div>
            ))
          )}
        </div>
      </Section>
      <Section title="Export your data" desc="Download a copy of your data (GDPR).">
        <button onClick={handleExport} disabled={exporting} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg disabled:opacity-50">
          {exporting ? 'Exporting…' : 'Export data'}
        </button>
      </Section>
      <Section title="Delete account" desc="Permanently deactivate your account. This cannot be undone.">
        <div className="flex gap-2 items-center">
          <input type="password" value={deletePass} onChange={(e) => setDeletePass(e.target.value)} placeholder="Enter your password" className="px-3 py-2 border border-slate-300 rounded text-sm max-w-xs" />
          <button onClick={handleDeleteAccount} disabled={deleting || !deletePass} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg disabled:opacity-50">
            {deleting ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
      </Section>
    </div>
  );
}

/* ══════════════════ TABS ══════════════════ */
const TABS = [
  { id: 'general', label: 'General' },
  { id: 'signatures', label: 'Signatures' },
  { id: 'templates', label: 'Templates' },
  { id: 'labels', label: 'Labels' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'accounts', label: 'Accounts and Import' },
  { id: 'security', label: 'Security' },
  { id: 'storage', label: 'Storage' },
  { id: 'filters', label: 'Filters and Blocked Addresses' },
  { id: 'forwarding', label: 'Forwarding and POP/IMAP' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'offline', label: 'Offline' },
  { id: 'themes', label: 'Themes' },
];

/* ══════════════════ MAIN ══════════════════ */
export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'general';
  const [tab, setTab] = useState(initialTab);

  // General settings state
  const [pageSize, setPageSize] = useState('25');
  const [undoSend, setUndoSend] = useState('10');
  const [replyBehavior, setReplyBehavior] = useState('reply');
  const [conversationView, setConversationView] = useState(true);
  const [hoverActions, setHoverActions] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [signature, setSignature] = useState('');
  const [vacationOn, setVacationOn] = useState(false);
  const [vacationSubject, setVacationSubject] = useState('');
  const [vacationMsg, setVacationMsg] = useState('');
  const [vacationStart, setVacationStart] = useState('');
  const [vacationEnd, setVacationEnd] = useState('');

  // Inbox settings
  const [inboxType, setInboxType] = useState('default');
  const [readingPane, setReadingPane] = useState('no-split');
  const [importanceMarkers, setImportanceMarkers] = useState(false);

  // Labels
  const systemLabels = ['Inbox', 'Starred', 'Snoozed', 'Important', 'Sent', 'Drafts', 'All Mail', 'Spam', 'Trash'];
  const [labelVisibility, setLabelVisibility] = useState<Record<string, boolean>>(
    Object.fromEntries(systemLabels.map((l) => [l, true]))
  );

  // Accounts
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Blocked addresses
  const [blockedAddresses] = useState<string[]>([]);
  const [blockInput, setBlockInput] = useState('');

  // Forwarding
  const [imapEnabled, setImapEnabled] = useState(true);
  const [forwardingAddress, setForwardingAddress] = useState('');

  // Advanced
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [templates, setTemplates] = useState(false);
  const [unreadBadge, setUnreadBadge] = useState(true);

  // Offline
  const [offlineMail, setOfflineMail] = useState(false);

  // Themes
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [accent, setAccent] = useState('emerald');

  // Storage
  const [usage, setUsage] = useState<{
    planName: string;
    planId: string | null;
    bytesUsed: number;
    bytesLimit: number | null;
    percentage: number;
    hasPendingUpgrade: boolean;
  } | null>(null);
  const [plans, setPlans] = useState<{ id: string; name: string; bytes_limit: number | null; price_label: string }[]>([]);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  useEffect(() => {
    if (tab === 'storage') {
      Promise.all([
        api<{ planName: string; planId: string | null; bytesUsed: number; bytesLimit: number | null; percentage: number; hasPendingUpgrade: boolean }>('/storage/usage'),
        api<{ plans: { id: string; name: string; bytes_limit: number | null; price_label: string }[] }>('/storage/plans'),
      ]).then(([u, p]) => {
        setUsage(u);
        setPlans(p.plans.filter((pl) => pl.name !== 'Unlimited'));
      }).catch(() => {});
    }
  }, [tab]);

  useEffect(() => {
    const saved = localStorage.getItem('mail_settings');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.pageSize) setPageSize(s.pageSize);
        if (s.undoSend) setUndoSend(s.undoSend);
        if (s.replyBehavior) setReplyBehavior(s.replyBehavior);
        if (s.conversationView !== undefined) setConversationView(s.conversationView);
        if (s.hoverActions !== undefined) setHoverActions(s.hoverActions);
        if (s.signature) setSignature(s.signature);
        if (s.inboxType) setInboxType(s.inboxType);
        if (s.readingPane) setReadingPane(s.readingPane);
        if (s.theme) setTheme(s.theme);
        if (s.accent) setAccent(s.accent);
      } catch {}
    }
  }, []);

  function saveSettings() {
    const settings = {
      pageSize, undoSend, replyBehavior, conversationView, hoverActions,
      signature, inboxType, readingPane, theme, accent,
    };
    localStorage.setItem('mail_settings', JSON.stringify(settings));

    // Apply theme
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else if (theme === 'light') document.documentElement.classList.remove('dark');
    else if (theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
    toast.success('Settings saved');
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) { toast.error('Fill in all password fields'); return; }
    if (newPassword !== confirmPassword) { toast.error("New passwords don't match"); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success('Password changed');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    }
  }

  async function requestUpgrade(planId: string) {
    setUpgradeLoading(true);
    try {
      await api('/storage/upgrade', {
        method: 'POST',
        body: JSON.stringify({ requestedPlanId: planId }),
      });
      toast.success('Upgrade request submitted. A Super Admin will review it shortly.');
      setUsage((u) => (u ? { ...u, hasPendingUpgrade: true } : null));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setUpgradeLoading(false);
    }
  }

  function fmtBytes(n: number | null): string {
    if (n === null || n === undefined) return 'Unlimited';
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${(n / 1024 ** 3).toFixed(1)} GB`;
  }

  const accents = [
    { id: 'emerald', color: 'bg-emerald-500', label: 'Emerald' },
    { id: 'blue', color: 'bg-blue-500', label: 'Blue' },
    { id: 'violet', color: 'bg-violet-500', label: 'Violet' },
    { id: 'rose', color: 'bg-rose-500', label: 'Rose' },
    { id: 'amber', color: 'bg-amber-500', label: 'Amber' },
    { id: 'teal', color: 'bg-teal-500', label: 'Teal' },
  ];

  return (
    <div className="flex-1 bg-white overflow-y-auto">
      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Search mail"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-300 transition-colors"
          />
        </div>
      </div>

      <div className="px-6 py-6">
        <h1 className="text-2xl font-normal text-slate-800 mb-4">Settings</h1>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-0 border-b border-slate-200 mb-6 -mx-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-b-2 border-emerald-500 text-emerald-600 font-medium'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ════ GENERAL ════ */}
        {tab === 'general' && (
          <div className="max-w-4xl">
            <Section title="Language" desc="Change language and display settings">
              <select className="px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/30">
                <option>English (United States)</option>
              </select>
            </Section>

            <Section title="Maximum page size" desc="Choose how many conversations to show per page">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Show</span>
                <select value={pageSize} onChange={(e) => setPageSize(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30">
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-slate-600">conversations per page</span>
              </div>
            </Section>

            <Section title="Undo Send" desc="Choose a cancellation period after sending">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Send cancellation period:</span>
                <select value={undoSend} onChange={(e) => setUndoSend(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30">
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="30">30</option>
                </select>
                <span className="text-slate-600">seconds</span>
              </div>
            </Section>

            <Section title="Default reply behavior">
              <div className="space-y-2">
                <Radio checked={replyBehavior === 'reply'} onChange={() => setReplyBehavior('reply')} label="Reply" />
                <Radio checked={replyBehavior === 'reply-all'} onChange={() => setReplyBehavior('reply-all')} label="Reply all" />
              </div>
            </Section>

            <Section title="Hover actions" desc="Quickly gain access to archive, delete, mark as read, and snooze on hover">
              <div className="space-y-2">
                <Radio checked={hoverActions} onChange={() => setHoverActions(true)} label="Enable hover actions" />
                <Radio checked={!hoverActions} onChange={() => setHoverActions(false)} label="Disable hover actions" />
              </div>
            </Section>

            <Section title="Conversation View" desc="Groups messages in the same thread together">
              <div className="space-y-2">
                <Radio checked={conversationView} onChange={() => setConversationView(true)} label="Conversation view on" />
                <Radio checked={!conversationView} onChange={() => setConversationView(false)} label="Conversation view off" />
              </div>
            </Section>

            <Section title="Desktop Notifications">
              <div className="space-y-2">
                <Radio checked={desktopNotifications} onChange={() => setDesktopNotifications(true)} label="New mail notifications on" />
                <Radio checked={!desktopNotifications} onChange={() => setDesktopNotifications(false)} label="Mail notifications off" />
              </div>
            </Section>

            <Section title="Signature" desc="Appended at the end of all outgoing messages">
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                rows={5}
                placeholder="Enter your signature..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 resize-none"
              />
            </Section>

            <Section title="Vacation responder" desc="Sends an automatic reply to incoming messages">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Radio checked={vacationOn} onChange={() => setVacationOn(true)} label="Vacation responder on" />
                  <Radio checked={!vacationOn} onChange={() => setVacationOn(false)} label="Vacation responder off" />
                </div>
                {vacationOn && (
                  <div className="space-y-2 pl-0 pt-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">First day:</label>
                        <input type="date" value={vacationStart} onChange={(e) => setVacationStart(e.target.value)}
                          className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Last day (optional):</label>
                        <input type="date" value={vacationEnd} onChange={(e) => setVacationEnd(e.target.value)}
                          className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
                      </div>
                    </div>
                    <input type="text" value={vacationSubject} onChange={(e) => setVacationSubject(e.target.value)}
                      placeholder="Subject"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30" />
                    <textarea value={vacationMsg} onChange={(e) => setVacationMsg(e.target.value)}
                      rows={4} placeholder="Message"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 resize-none" />
                  </div>
                )}
              </div>
            </Section>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={saveSettings} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* ════ SIGNATURES ════ */}
        {tab === 'signatures' && (
          <SignaturesTab />
        )}

        {/* ════ TEMPLATES ════ */}
        {tab === 'templates' && (
          <TemplatesTab />
        )}

        {/* ════ LABELS ════ */}
        {tab === 'labels' && (
          <div className="max-w-3xl">
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Label name</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Show in label list</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Show in IMAP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-50/50">
                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">System labels</td>
                  </tr>
                  {systemLabels.map((label) => (
                    <tr key={label} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-700">{label}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setLabelVisibility((p) => ({ ...p, [label]: true }))}
                            className={`text-xs ${labelVisibility[label] ? 'text-emerald-600 font-medium' : 'text-slate-400 hover:text-slate-600'}`}
                          >show</button>
                          <button
                            onClick={() => setLabelVisibility((p) => ({ ...p, [label]: false }))}
                            className={`text-xs ${!labelVisibility[label] ? 'text-emerald-600 font-medium' : 'text-slate-400 hover:text-slate-600'}`}
                          >hide</button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded text-emerald-500 focus:ring-emerald-400" />
                          <span className="text-xs text-slate-500">Show in IMAP</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/50">
                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categories</td>
                  </tr>
                  {['Purchases', 'Social', 'Updates', 'Forums', 'Promotions'].map((cat) => (
                    <tr key={cat} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-700">{cat}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <button className="text-xs text-slate-400 hover:text-slate-600">show</button>
                          <button className="text-xs text-emerald-600 font-medium">hide</button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                + Create new label
              </button>
            </div>
          </div>
        )}

        {/* ════ INBOX ════ */}
        {tab === 'inbox' && (
          <div className="max-w-4xl space-y-0">
            <Section title="Inbox type">
              <div className="space-y-3">
                {[
                  { id: 'default', label: 'Default' },
                  { id: 'important-first', label: 'Important first' },
                  { id: 'unread-first', label: 'Unread first' },
                  { id: 'starred-first', label: 'Starred first' },
                  { id: 'priority', label: 'Priority Inbox' },
                ].map((opt) => (
                  <Radio key={opt.id} checked={inboxType === opt.id} onChange={() => setInboxType(opt.id)} label={opt.label} />
                ))}
              </div>
            </Section>

            <Section title="Reading pane" desc="Provides a way to read mail next to your list of conversations">
              <div className="space-y-2">
                {[
                  { id: 'no-split', label: 'No split' },
                  { id: 'right', label: 'Right of inbox' },
                  { id: 'below', label: 'Below inbox' },
                ].map((opt) => (
                  <Radio key={opt.id} checked={readingPane === opt.id} onChange={() => setReadingPane(opt.id)} label={opt.label} />
                ))}
              </div>
            </Section>

            <Section title="Importance markers">
              <div className="space-y-2">
                <Radio checked={importanceMarkers} onChange={() => setImportanceMarkers(true)} label="Show markers — Show a marker (›) by messages marked as important" />
                <Radio checked={!importanceMarkers} onChange={() => setImportanceMarkers(false)} label="No markers" />
              </div>
            </Section>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={saveSettings} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* ════ ACCOUNTS ════ */}
        {tab === 'accounts' && (
          <div className="max-w-4xl">
            <Section title="Change account settings">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                  />
                </div>
              </div>
            </Section>

            <Section title="Change password">
              <div className="space-y-3 max-w-sm">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                />
                <button
                  onClick={changePassword}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Change Password
                </button>
              </div>
            </Section>

            <Section title="Send mail as" desc="Use Adventist Mail to send from your other email addresses">
              <p className="text-sm text-slate-500">No additional addresses configured.</p>
              <button className="mt-2 text-sm text-emerald-600 hover:underline">Add another email address</button>
            </Section>

            <Section title="Grant access to your account" desc="Allow others to read and send mail on your behalf">
              <p className="text-sm text-slate-500">No delegates configured.</p>
              <button className="mt-2 text-sm text-emerald-600 hover:underline">Add another account</button>
            </Section>
          </div>
        )}

        {/* ════ SECURITY (Sessions) ════ */}
        {tab === 'security' && (
          <SecurityTab />
        )}

        {/* ════ STORAGE ════ */}
        {tab === 'storage' && (
          <div className="max-w-4xl">
            <Section title="Storage" desc="Your mailbox storage usage and plan">
              <div className="space-y-4">
                {usage ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">{usage.planName}</span> plan
                        {usage.hasPendingUpgrade && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Upgrade pending</span>
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        {fmtBytes(usage.bytesUsed)} / {fmtBytes(usage.bytesLimit)}
                      </p>
                    </div>
                    <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usage.percentage >= 95 ? 'bg-red-500' : usage.percentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, usage.percentage)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Loading…</p>
                )}
              </div>
            </Section>

            {usage && !usage.hasPendingUpgrade && plans.length > 0 && (
              <Section title="Upgrade plan" desc="Request more storage — a Super Admin will approve">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {plans
                    .filter((p) => p.name !== usage.planName)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-300 transition-colors"
                      >
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <p className="text-sm text-slate-500 mt-1">{fmtBytes(p.bytes_limit)}</p>
                        <button
                          onClick={() => requestUpgrade(p.id)}
                          disabled={upgradeLoading}
                          className="mt-3 w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {upgradeLoading ? 'Requesting…' : 'Request Upgrade'}
                        </button>
                      </div>
                    ))}
                </div>
              </Section>
            )}

            {usage?.hasPendingUpgrade && (
              <p className="text-sm text-slate-500 pt-2">Your upgrade request is pending. A Super Admin will review it shortly.</p>
            )}
          </div>
        )}

        {/* ════ FILTERS ════ */}
        {tab === 'filters' && <FiltersTab />}

        {/* ════ FORWARDING ════ */}
        {tab === 'forwarding' && (
          <div className="max-w-4xl">
            <Section title="Forwarding">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Add a forwarding address to automatically forward your mail.</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={forwardingAddress}
                    onChange={(e) => setForwardingAddress(e.target.value)}
                    placeholder="forward@example.com"
                    className="flex-1 max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                  />
                  <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors">
                    Add forwarding address
                  </button>
                </div>
              </div>
            </Section>

            <Section title="IMAP access" desc="Access Adventist Mail from other email clients using IMAP">
              <div className="space-y-2">
                <Radio checked={imapEnabled} onChange={() => setImapEnabled(true)} label="Enable IMAP" />
                <Radio checked={!imapEnabled} onChange={() => setImapEnabled(false)} label="Disable IMAP" />
              </div>
              {imapEnabled && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                  <p><strong>IMAP Server:</strong> imap.adventistmail.org</p>
                  <p><strong>Port:</strong> 993 (SSL/TLS)</p>
                  <p><strong>SMTP Server:</strong> smtp.adventistmail.org</p>
                  <p><strong>Port:</strong> 587 (STARTTLS)</p>
                </div>
              )}
            </Section>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={saveSettings} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* ════ ADVANCED ════ */}
        {tab === 'advanced' && (
          <div className="max-w-4xl">
            {[
              {
                title: 'Auto-advance',
                desc: 'Show the next conversation instead of your Inbox after you delete, archive or mute a conversation.',
                checked: autoAdvance,
                onChange: setAutoAdvance,
              },
              {
                title: 'Templates',
                desc: 'Enable pre-written replies. Templates can be created and inserted through the "More options" menu in the compose toolbar.',
                checked: templates,
                onChange: setTemplates,
              },
              {
                title: 'Unread message icon and badge',
                desc: 'See how many unread messages you have in your inbox at a glance.',
                checked: unreadBadge,
                onChange: setUnreadBadge,
              },
            ].map(({ title, desc, checked, onChange }) => (
              <div key={title} className="flex items-start justify-between py-5 border-b border-slate-100 last:border-0 gap-8">
                <div>
                  <p className="text-sm font-medium text-slate-800">{title}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-lg">{desc}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <button
                    onClick={() => onChange(true)}
                    className={`text-sm ${checked ? 'text-emerald-600 font-medium' : 'text-slate-400 hover:text-slate-600'}`}
                  >Enable</button>
                  <button
                    onClick={() => onChange(false)}
                    className={`text-sm ${!checked ? 'text-emerald-600 font-medium' : 'text-slate-400 hover:text-slate-600'}`}
                  >Disable</button>
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={saveSettings} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* ════ OFFLINE ════ */}
        {tab === 'offline' && (
          <div className="max-w-4xl">
            <Section title="Offline" desc="Access your mail even when you're not connected to the internet.">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={offlineMail}
                  onChange={(e) => setOfflineMail(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400"
                />
                <span className="text-sm text-slate-700">Enable offline mail</span>
              </label>
              {offlineMail && (
                <p className="text-xs text-slate-400 mt-2">
                  Offline mail allows you to read, reply, and search your mail even without an internet connection. Sync happens when you reconnect.
                </p>
              )}
            </Section>
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={saveSettings} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* ════ THEMES ════ */}
        {tab === 'themes' && (
          <div className="max-w-4xl">
            <Section title="Display mode">
              <div className="flex gap-4">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      theme === t ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-16 h-12 rounded-lg flex items-center justify-center ${
                      t === 'dark' ? 'bg-slate-800' : t === 'system' ? 'bg-gradient-to-r from-white to-slate-800' : 'bg-slate-50 border border-slate-200'
                    }`}>
                      <svg className={`w-6 h-6 ${t === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {t === 'dark'
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          : t === 'system'
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        }
                      </svg>
                    </div>
                    <span className={`text-xs font-medium capitalize ${theme === t ? 'text-emerald-600' : 'text-slate-600'}`}>{t}</span>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Accent color">
              <div className="flex gap-3 flex-wrap">
                {accents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAccent(a.id)}
                    title={a.label}
                    className={`w-9 h-9 rounded-full ${a.color} flex items-center justify-center transition-transform hover:scale-110 ${
                      accent === a.id ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                    }`}
                  >
                    {accent === a.id && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </Section>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={saveSettings} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

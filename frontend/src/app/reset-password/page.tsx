'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError('Missing reset token. Please use the link from your email.');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060D1B] font-sans p-4">
      <div className="w-full max-w-[760px] flex rounded-2xl overflow-hidden shadow-2xl" style={{ minHeight: '420px' }}>

        {/* ── Left: Illustration ── */}
        <div className="w-[260px] shrink-0 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f38 50%, #091220 100%)' }}>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-36 h-36 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6">
            <div className="w-32 h-20 bg-white/5 border border-white/10 rounded-2xl shadow-xl flex items-center justify-center">
              <svg className="w-9 h-9 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white/70 text-sm font-semibold">Adventist Church Mail</p>
              <p className="text-white/30 text-xs mt-0.5">Secure · Private · Connected</p>
            </div>
          </div>
        </div>

        {/* ── Right: Form ── */}
        <div className="flex-1 bg-[#0E1829] flex flex-col justify-center px-10 py-12">
          {!done ? (
            <>
              <h1 className="text-xl font-bold text-white mb-1 tracking-tight">Set a new password</h1>
              <p className="text-xs text-white/40 mb-7">Choose a strong password for your account</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    required
                    autoFocus
                    className="w-full px-4 py-3 bg-transparent border border-white/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/60 transition-colors"
                  />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="w-full px-4 py-3 bg-transparent border border-white/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/60 transition-colors"
                />

                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setShowPassword(!showPassword)}
                    className={`w-4 h-4 rounded border transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                      showPassword ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 bg-transparent'
                    }`}
                  >
                    {showPassword && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-white/50">Show password</span>
                </label>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full py-3 bg-[#1E2D45] hover:bg-[#253550] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors mt-1"
                >
                  {loading ? 'Saving…' : 'Set new password'}
                </button>
              </form>

              <div className="mt-5">
                <Link href="/forgot-password" className="text-xs text-white/40 hover:text-white/70 transition-colors">
                  ← Request a new link
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Password updated!</h1>
                  <p className="text-xs text-white/40 mt-0.5">You can now sign in with your new password</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3 bg-[#1E2D45] hover:bg-[#253550] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Go to sign in
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

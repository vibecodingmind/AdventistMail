'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    setError('');
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch {
      // silently ignore — always show success
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
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
          {!sent ? (
            <>
              <h1 className="text-xl font-bold text-white mb-1 tracking-tight">Forgot your password?</h1>
              <p className="text-xs text-white/40 mb-7">Enter your email and we&apos;ll send you a reset link</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-transparent border border-white/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/60 transition-colors"
                />

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#1E2D45] hover:bg-[#253550] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-5">
                <Link href="/login" className="text-xs text-white/40 hover:text-white/70 transition-colors">
                  ← Back to sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Check your email</h1>
                  <p className="text-xs text-white/40 mt-0.5">Reset link sent to <span className="text-emerald-400">{email}</span></p>
                </div>
              </div>

              <p className="text-sm text-white/50 leading-relaxed mb-6">
                If an account exists for that email, you&apos;ll receive a link to reset your password. The link expires in <span className="text-white/70">1 hour</span>.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="w-full py-3 border border-white/20 hover:border-white/40 disabled:opacity-50 text-white/60 hover:text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Resending…' : 'Resend email'}
                </button>
                <Link
                  href="/login"
                  className="w-full py-3 bg-[#1E2D45] hover:bg-[#253550] text-white text-sm font-semibold rounded-lg transition-colors text-center"
                >
                  Back to sign in
                </Link>
              </div>

              <p className="text-xs text-white/25 mt-5">
                Didn&apos;t receive it? Check your spam folder or try a different email.
              </p>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

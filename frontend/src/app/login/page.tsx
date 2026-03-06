'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<{ accessToken: string; refreshToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      router.push('/mail');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060D1B] font-sans p-4">
      <div className="w-full max-w-[760px] flex rounded-2xl overflow-hidden shadow-2xl" style={{ minHeight: '420px' }}>

        {/* ── Left: Form ── */}
        <div className="flex-1 bg-[#0E1829] flex flex-col justify-center px-10 py-12">
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Login</h1>
          <p className="text-xs text-white/40 mb-8">If You Are Already A Member, Easily Log In</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@church.org"
              required
              className="w-full px-4 py-3 bg-transparent border border-white/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/60 transition-colors"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 pr-11 bg-transparent border border-white/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/60 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1E2D45] hover:bg-[#253550] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          {/* OR divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/25 font-medium">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Create account */}
          <Link
            href="/signup"
            className="w-full py-3 flex items-center justify-center gap-2 border border-white/20 rounded-lg text-sm font-semibold text-white/70 hover:border-white/40 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Create an Account
          </Link>

          {/* Footer links */}
          <div className="mt-5">
            <button className="text-xs text-white/30 hover:text-white/60 transition-colors block">
              Forgot my password
            </button>
          </div>
        </div>

        {/* ── Right: Illustration ── */}
        <div className="w-[280px] shrink-0 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f38 50%, #091220 100%)' }}>
          {/* Glow orbs */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6">
            {/* Envelope card */}
            <div className="relative">
              <div className="w-36 h-24 bg-white/5 border border-white/10 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-2.5 p-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div className="space-y-1 w-full">
                  <div className="h-1 bg-white/15 rounded-full w-full" />
                  <div className="h-1 bg-white/10 rounded-full w-4/5" />
                </div>
              </div>
              {/* Badge */}
              <div className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xs font-bold">3</span>
              </div>
            </div>

            {/* Mini cards */}
            <div className="flex gap-2.5">
              {[
                { label: 'Inbox', color: 'bg-emerald-500/80' },
                { label: 'Sent', color: 'bg-indigo-500/70' },
                { label: 'Drafts', color: 'bg-slate-500/60' },
              ].map(({ label, color }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <div className={`w-6 h-6 rounded-lg ${color}`} />
                  <p className="text-white/50 text-xs">{label}</p>
                </div>
              ))}
            </div>

            {/* Tagline */}
            <div className="text-center">
              <p className="text-white/70 text-sm font-semibold">Adventist Church Mail</p>
              <p className="text-white/30 text-xs mt-0.5">Secure · Private · Connected</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

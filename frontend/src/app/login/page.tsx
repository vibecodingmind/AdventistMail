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
    <div className="min-h-screen flex items-center justify-center bg-[#eef0f8] dark:bg-slate-950 p-4 font-sans">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden flex" style={{ minHeight: '520px' }}>

        {/* Left — Form */}
        <div className="flex-1 flex flex-col justify-center px-12 py-14">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-2">Login</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-9">
            If You Are Already A Member, Easily Log In
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full px-4 py-3 bg-[#f5f6fa] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 dark:focus:border-teal-500 transition-colors"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-4 py-3 bg-[#f5f6fa] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 dark:focus:border-teal-500 transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4.5 h-4.5 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-500 dark:text-red-400 px-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-700 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          <Link
            href="/signup"
            className="w-full py-3 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Create an Account
          </Link>

          <div className="mt-6 space-y-3">
            <button className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors block">
              Forgot my password
            </button>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400 dark:text-slate-500">If You Don&apos;t Have An Account, Create</p>
              <Link
                href="/signup"
                className="text-xs font-medium px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        </div>

        {/* Right — Illustration panel */}
        <div className="hidden md:flex w-[420px] shrink-0 relative overflow-hidden rounded-3xl m-3">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950" />

          {/* Grid lines */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />

          {/* Glow orbs */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl" />

          {/* Envelope illustration */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
            <div className="relative">
              <div className="w-40 h-28 bg-white/10 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-5">
                <svg className="w-12 h-12 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div className="space-y-1.5 w-full">
                  <div className="h-1.5 bg-white/20 rounded-full w-full" />
                  <div className="h-1.5 bg-white/15 rounded-full w-4/5" />
                  <div className="h-1.5 bg-white/10 rounded-full w-3/5" />
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-teal-400 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xs font-bold">3</span>
              </div>
            </div>

            {/* Small cards */}
            <div className="flex gap-3 w-full justify-center">
              {['Inbox', 'Sent', 'Drafts'].map((label, i) => (
                <div key={label} className="flex-1 max-w-[80px] bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-center backdrop-blur-sm">
                  <div className={`w-6 h-6 rounded-lg mx-auto mb-1.5 ${i === 0 ? 'bg-teal-400/80' : i === 1 ? 'bg-indigo-400/80' : 'bg-slate-400/60'}`} />
                  <p className="text-white/60 text-xs">{label}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <p className="text-white/80 text-sm font-semibold tracking-wide">Adventist Church Mail</p>
              <p className="text-white/40 text-xs mt-1">Secure · Private · Connected</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

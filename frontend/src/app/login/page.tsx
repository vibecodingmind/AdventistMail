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
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setStep('password');
  }

  async function handleSignIn(e: React.FormEvent) {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#202124] font-sans">
      {/* Card */}
      <div className="w-full max-w-[850px] mx-4">
        <div className="bg-[#303134] rounded-2xl overflow-hidden flex min-h-[360px]">

          {/* ── Left: branding ── */}
          <div className="w-[340px] shrink-0 flex flex-col justify-center px-10 py-12">
            {/* Logo mark */}
            <div className="mb-6">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 flex items-end justify-start">
                  <div className="w-0 h-0 border-l-[20px] border-l-transparent border-b-[32px] border-b-emerald-500" />
                </div>
                <div className="absolute inset-0 flex items-start justify-end">
                  <div className="w-0 h-0 border-r-[20px] border-r-transparent border-t-[32px] border-t-orange-400" />
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-normal text-white mb-2 tracking-tight">Sign in</h1>
            <p className="text-sm text-[#e8eaed]/70 leading-relaxed max-w-[240px]">
              with your Adventist Church account. This account will be available across all church apps.
            </p>
          </div>

          {/* Divider */}
          <div className="w-px bg-white/10 self-stretch my-8" />

          {/* ── Right: form ── */}
          <div className="flex-1 flex flex-col justify-between px-10 py-10">
            {step === 'email' ? (
              <form onSubmit={handleNext} className="flex flex-col gap-4">
                {/* Email input */}
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder=" "
                    className="peer w-full px-3 pt-5 pb-2 bg-transparent border border-white/20 rounded text-sm text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8] transition-colors"
                  />
                  <label
                    htmlFor="email"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#e8eaed]/60 pointer-events-none transition-all
                      peer-focus:top-3 peer-focus:text-xs peer-focus:text-[#8ab4f8]
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs"
                  >
                    Email or phone
                  </label>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  type="button"
                  className="text-left text-sm text-[#8ab4f8] hover:underline w-fit"
                >
                  Forgot email?
                </button>

                <p className="text-xs text-[#e8eaed]/50 leading-relaxed mt-1">
                  Not your computer? Use Guest mode to sign in privately.{' '}
                  <button className="text-[#8ab4f8] hover:underline">
                    Learn more about using Guest mode
                  </button>
                </p>

                <div className="flex items-center justify-between mt-4">
                  <Link
                    href="/signup"
                    className="text-sm text-[#8ab4f8] hover:underline"
                  >
                    Create account
                  </Link>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#8ab4f8] hover:bg-[#93bbf9] text-[#202124] text-sm font-medium rounded-full transition-colors"
                  >
                    Next
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                {/* Email display */}
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="flex items-center gap-2 text-sm text-[#8ab4f8] hover:underline w-fit mb-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {email}
                </button>

                {/* Password input */}
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder=" "
                    autoFocus
                    className="peer w-full px-3 pt-5 pb-2 pr-10 bg-transparent border border-white/20 rounded text-sm text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8] transition-colors"
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#e8eaed]/60 pointer-events-none transition-all
                      peer-focus:top-3 peer-focus:text-xs peer-focus:text-[#8ab4f8]
                      peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs"
                  >
                    Enter your password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#e8eaed]/50 hover:text-[#e8eaed] transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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
                  type="button"
                  className="text-left text-sm text-[#8ab4f8] hover:underline w-fit"
                >
                  Forgot password?
                </button>

                <div className="flex items-center justify-between mt-4">
                  <Link
                    href="/signup"
                    className="text-sm text-[#8ab4f8] hover:underline"
                  >
                    Create account
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-[#8ab4f8] hover:bg-[#93bbf9] disabled:opacity-60 text-[#202124] text-sm font-medium rounded-full transition-colors"
                  >
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between w-full max-w-[850px] mx-4 mt-4 px-2">
        <div className="flex items-center gap-1 text-xs text-[#e8eaed]/50">
          <span>English (United States)</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="flex items-center gap-5 text-xs text-[#e8eaed]/50">
          <button className="hover:text-[#e8eaed]/80 transition-colors">Help</button>
          <button className="hover:text-[#e8eaed]/80 transition-colors">Privacy</button>
          <button className="hover:text-[#e8eaed]/80 transition-colors">Terms</button>
        </div>
      </div>
    </div>
  );
}

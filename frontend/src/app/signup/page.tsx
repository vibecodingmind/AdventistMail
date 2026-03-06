'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          displayName: displayName || undefined,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              Account Created
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
            Your account has been created. An admin must verify your account before you can sign in.
          </p>
          <Link
            href="/login"
            className="block w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-center font-medium transition-colors"
          >
            Back to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xl tracking-tight">A</span>
          </div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            Create Account
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
              placeholder="you@church.org"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Display Name (optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

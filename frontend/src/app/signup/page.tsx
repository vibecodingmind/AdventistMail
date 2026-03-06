'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

/* ── Reusable outlined input (Google Material style) ── */
function OutlinedInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  required,
  autoFocus,
  suffix,
  className,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoFocus?: boolean;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        placeholder=" "
        className="peer w-full pl-3 pr-3 pt-5 pb-2 bg-transparent border border-white/20 rounded text-sm text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8] transition-colors"
        style={suffix ? { paddingRight: `${suffix.length * 8 + 12}px` } : {}}
      />
      <label
        htmlFor={id}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#e8eaed]/60 pointer-events-none transition-all duration-150
          peer-focus:top-[11px] peer-focus:text-xs peer-focus:text-[#8ab4f8]
          peer-[:not(:placeholder-shown)]:top-[11px] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-[#e8eaed]/60"
      >
        {label}
      </label>
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#e8eaed]/40 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ── Outlined select ── */
function OutlinedSelect({
  id,
  label,
  value,
  onChange,
  children,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="peer w-full pl-3 pr-8 pt-5 pb-2 bg-[#303134] border border-white/20 rounded text-sm text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8] transition-colors appearance-none"
      >
        {children}
      </select>
      <label
        htmlFor={id}
        className={`absolute left-3 text-xs pointer-events-none transition-colors ${
          value ? 'top-[11px] text-[#e8eaed]/60' : 'top-1/2 -translate-y-1/2 text-sm text-[#e8eaed]/60'
        }`}
      >
        {label}
      </label>
      <svg
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#e8eaed]/50 pointer-events-none"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

/* ── Shell — dark card + footer ── */
function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#202124] font-sans">
      <div className="w-full max-w-[850px] mx-4">
        <div className="bg-[#303134] rounded-2xl overflow-hidden flex min-h-[340px]">
          {/* Left */}
          <div className="w-[320px] shrink-0 flex flex-col justify-center px-10 py-12">
            {/* Logo */}
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
            <h1 className="text-3xl font-normal text-white mb-3 tracking-tight leading-tight">{title}</h1>
            <p className="text-sm text-[#e8eaed]/60">{subtitle}</p>
          </div>

          {/* Divider */}
          <div className="w-px bg-white/10 self-stretch my-8" />

          {/* Right */}
          <div className="flex-1 flex flex-col justify-center px-10 py-10">
            {children}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between w-full max-w-[850px] mx-4 mt-4 px-2">
        <div className="flex items-center gap-1 text-xs text-[#e8eaed]/40">
          <span>English (United States)</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="flex items-center gap-5 text-xs text-[#e8eaed]/40">
          <button className="hover:text-[#e8eaed]/70 transition-colors">Help</button>
          <button className="hover:text-[#e8eaed]/70 transition-colors">Privacy</button>
          <button className="hover:text-[#e8eaed]/70 transition-colors">Terms</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
type Step = 'name' | 'basic' | 'email' | 'password' | 'success';

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('name');

  // Step 1 — Name
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Step 2 — Basic info
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');

  // Step 3 — Email
  const [email, setEmail] = useState('');

  // Step 4 — Password
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          displayName: [firstName, lastName].filter(Boolean).join(' ') || undefined,
        }),
      });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 1: Name ── */
  if (step === 'name') {
    return (
      <Shell title="Create an Adventist Account" subtitle="Enter your name">
        <form
          onSubmit={(e) => { e.preventDefault(); if (firstName.trim()) setStep('basic'); }}
          className="flex flex-col gap-4"
        >
          <div className="flex gap-3">
            <OutlinedInput id="first" label="First name" value={firstName} onChange={setFirstName} required autoFocus />
            <OutlinedInput id="last" label="Last name (optional)" value={lastName} onChange={setLastName} />
          </div>
          <div className="flex items-center justify-between mt-6">
            <Link href="/login" className="text-sm text-[#8ab4f8] hover:underline">
              Sign in instead
            </Link>
            <button
              type="submit"
              className="px-6 py-2 bg-[#8ab4f8] hover:bg-[#93bbf9] text-[#202124] text-sm font-medium rounded-full transition-colors"
            >
              Next
            </button>
          </div>
        </form>
      </Shell>
    );
  }

  /* ── Step 2: Basic information ── */
  if (step === 'basic') {
    return (
      <Shell title="Basic information" subtitle="Enter your birthday and gender">
        <form
          onSubmit={(e) => { e.preventDefault(); setStep('email'); }}
          className="flex flex-col gap-4"
        >
          {/* Birthday row */}
          <div className="flex gap-2">
            <OutlinedSelect id="month" label="Month" value={month} onChange={setMonth} className="flex-1">
              <option value="" />
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </OutlinedSelect>
            <OutlinedInput id="day" label="Day" value={day} onChange={setDay} className="w-20" />
            <OutlinedInput id="year" label="Year" value={year} onChange={setYear} className="w-28" />
          </div>

          {/* Gender */}
          <OutlinedSelect id="gender" label="Gender" value={gender} onChange={setGender}>
            <option value="" />
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Rather not say</option>
          </OutlinedSelect>

          <button type="button" className="text-sm text-[#8ab4f8] hover:underline text-left w-fit">
            Why we ask for your birthday and gender
          </button>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => setStep('name')}
              className="text-sm text-[#8ab4f8] hover:underline"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#8ab4f8] hover:bg-[#93bbf9] text-[#202124] text-sm font-medium rounded-full transition-colors"
            >
              Next
            </button>
          </div>
        </form>
      </Shell>
    );
  }

  /* ── Step 3: Email address ── */
  if (step === 'email') {
    return (
      <Shell title="Create your email address" subtitle="Your Adventist Church email address">
        <form
          onSubmit={(e) => { e.preventDefault(); if (email.trim()) setStep('password'); }}
          className="flex flex-col gap-4"
        >
          <OutlinedInput
            id="email"
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoFocus
          />
          <p className="text-xs text-[#e8eaed]/50">
            You can use letters, numbers & periods
          </p>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => setStep('basic')}
              className="text-sm text-[#8ab4f8] hover:underline"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#8ab4f8] hover:bg-[#93bbf9] text-[#202124] text-sm font-medium rounded-full transition-colors"
            >
              Next
            </button>
          </div>
        </form>
      </Shell>
    );
  }

  /* ── Step 4: Password ── */
  if (step === 'password') {
    return (
      <Shell title="Create a strong password" subtitle="Create a strong password with a mix of letters, numbers and symbols">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="flex flex-col gap-4"
        >
          <OutlinedInput
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            required
            autoFocus
          />
          <OutlinedInput
            id="confirm"
            label="Confirm"
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={setConfirm}
            required
          />

          {/* Show password checkbox */}
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <div
              onClick={() => setShowPassword(!showPassword)}
              className={`w-4 h-4 rounded-sm border transition-colors flex items-center justify-center cursor-pointer ${
                showPassword ? 'bg-[#8ab4f8] border-[#8ab4f8]' : 'border-white/30 bg-transparent'
              }`}
            >
              {showPassword && (
                <svg className="w-3 h-3 text-[#202124]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-[#e8eaed]/80">Show password</span>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); }}
              className="text-sm text-[#8ab4f8] hover:underline"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#8ab4f8] hover:bg-[#93bbf9] disabled:opacity-60 text-[#202124] text-sm font-medium rounded-full transition-colors"
            >
              {loading ? 'Creating…' : 'Next'}
            </button>
          </div>
        </form>
      </Shell>
    );
  }

  /* ── Step 5: Success ── */
  return (
    <Shell title="Account submitted!" subtitle="Awaiting admin verification">
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-[#e8eaed]/80 leading-relaxed">
              Your account request for <span className="text-[#8ab4f8]">{email}</span> has been submitted.
            </p>
            <p className="text-sm text-[#e8eaed]/50 mt-2 leading-relaxed">
              An administrator must approve your account before you can sign in. You will be notified once it&apos;s verified.
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-[#8ab4f8] hover:bg-[#93bbf9] text-[#202124] text-sm font-medium rounded-full transition-colors"
          >
            Go to Sign in
          </button>
        </div>
      </div>
    </Shell>
  );
}

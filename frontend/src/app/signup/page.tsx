'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';

const GoogleOAuthButton = dynamic(() => import('@/components/GoogleOAuthButton'), { ssr: false });

const hasGoogleClientId = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/* ── Input matching login page style ── */
function DarkInput({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
  className,
}: {
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      autoFocus={autoFocus}
      className={`w-full px-4 py-3 bg-transparent border border-white/20 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/60 transition-colors ${className ?? ''}`}
    />
  );
}

/* ── Select matching login page style ── */
function DarkSelect({
  id,
  value,
  onChange,
  children,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-3 bg-[#0E1829] border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-400/60 transition-colors appearance-none ${className ?? ''}`}
    >
      {children}
    </select>
  );
}

/* ── Shell wrapper ── */
function Shell({
  step,
  stepIndex,
  totalSteps,
  title,
  subtitle,
  children,
}: {
  step: string;
  stepIndex: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060D1B] font-sans p-4">
      <div className="w-full max-w-[760px] flex rounded-2xl overflow-hidden shadow-2xl" style={{ minHeight: '420px' }}>

        {/* ── Left: Illustration panel (mirrors login right side) ── */}
        <div className="w-[260px] shrink-0 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f38 50%, #091220 100%)' }}>
          {/* Glow orbs */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-36 h-36 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6">
            {/* Envelope icon */}
            <div className="relative">
              <div className="w-32 h-20 bg-white/5 border border-white/10 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-2 p-3">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="space-y-1 w-full">
                  <div className="h-1 bg-white/15 rounded-full w-full" />
                  <div className="h-1 bg-white/10 rounded-full w-3/4 mx-auto" />
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>

            {/* Step progress dots */}
            {step !== 'success' && (
              <div className="flex gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i < stepIndex
                        ? 'w-4 h-1.5 bg-emerald-400'
                        : i === stepIndex
                        ? 'w-6 h-1.5 bg-emerald-400'
                        : 'w-4 h-1.5 bg-white/15'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Tagline */}
            <div className="text-center">
              <p className="text-white/70 text-sm font-semibold">Adventist Church Mail</p>
              <p className="text-white/30 text-xs mt-0.5">Secure · Private · Connected</p>
            </div>
          </div>
        </div>

        {/* ── Right: Form ── */}
        <div className="flex-1 bg-[#0E1829] flex flex-col justify-center px-10 py-12">
          <h1 className="text-xl font-bold text-white mb-1 tracking-tight">{title}</h1>
          <p className="text-xs text-white/40 mb-7">{subtitle}</p>
          {children}
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
type Step = 'name' | 'basic' | 'email' | 'password' | 'success';
const STEP_ORDER: Step[] = ['name', 'basic', 'email', 'password'];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('name');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const stepIndex = STEP_ORDER.indexOf(step as Step);

  async function handleSubmit() {
    if (password !== confirm) { setError("Passwords don't match."); return; }
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

  const navBtn = (label: string, onClick: () => void, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs text-white/40 hover:text-white/70 transition-colors"
    >
      {label}
    </button>
  );

  const nextBtn = (label = 'Next', disabled = false) => (
    <button
      type="submit"
      disabled={disabled}
      className="px-5 py-2.5 bg-[#1E2D45] hover:bg-[#253550] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
    >
      {label}
    </button>
  );

  /* ── Step 1: Name ── */
  if (step === 'name') {
    return (
      <Shell step={step} stepIndex={0} totalSteps={4} title="Create an Adventist Account" subtitle="Enter your first and last name">
        <form onSubmit={(e) => { e.preventDefault(); if (firstName.trim()) setStep('basic'); }} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <DarkInput id="first" placeholder="First name" value={firstName} onChange={setFirstName} required autoFocus />
            <DarkInput id="last" placeholder="Last name (optional)" value={lastName} onChange={setLastName} />
          </div>

          {hasGoogleClientId && (
            <>
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/25 font-medium">OR</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <GoogleOAuthButton mode="signup" onSuccess={() => setStep('success')} onError={() => setStep('success')} />
            </>
          )}

          <div className="flex items-center justify-between mt-4">
            <Link href="/login" className="text-xs text-white/40 hover:text-white/70 transition-colors">Sign in instead</Link>
            {nextBtn()}
          </div>
        </form>
      </Shell>
    );
  }

  /* ── Step 2: Basic info ── */
  if (step === 'basic') {
    return (
      <Shell step={step} stepIndex={1} totalSteps={4} title="Basic information" subtitle="Enter your birthday and gender">
        <form onSubmit={(e) => { e.preventDefault(); setStep('email'); }} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <DarkSelect id="month" value={month} onChange={setMonth} className="flex-1">
                <option value="">Month</option>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </DarkSelect>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <DarkInput id="day" placeholder="Day" value={day} onChange={setDay} className="w-20" />
            <DarkInput id="year" placeholder="Year" value={year} onChange={setYear} className="w-24" />
          </div>

          <div className="relative">
            <DarkSelect id="gender" value={gender} onChange={setGender}>
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Rather not say</option>
            </DarkSelect>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div className="flex items-center justify-between mt-4">
            {navBtn('← Back', () => setStep('name'))}
            {nextBtn()}
          </div>
        </form>
      </Shell>
    );
  }

  /* ── Step 3: Email ── */
  if (step === 'email') {
    return (
      <Shell step={step} stepIndex={2} totalSteps={4} title="Create your email address" subtitle="Your Adventist Church email">
        <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) setStep('password'); }} className="flex flex-col gap-3">
          <DarkInput id="email" type="email" placeholder="you@church.org" value={email} onChange={setEmail} required autoFocus />
          <p className="text-xs text-white/30">You can use letters, numbers & periods</p>
          <div className="flex items-center justify-between mt-4">
            {navBtn('← Back', () => setStep('basic'))}
            {nextBtn()}
          </div>
        </form>
      </Shell>
    );
  }

  /* ── Step 4: Password ── */
  if (step === 'password') {
    return (
      <Shell step={step} stepIndex={3} totalSteps={4} title="Create a strong password" subtitle="Mix of letters, numbers and symbols">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex flex-col gap-3">
          <div className="relative">
            <DarkInput id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={setPassword} required autoFocus />
          </div>
          <DarkInput id="confirm" type={showPassword ? 'text' : 'password'} placeholder="Confirm password" value={confirm} onChange={setConfirm} required />

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

          <div className="flex items-center justify-between mt-4">
            {navBtn('← Back', () => { setStep('email'); setError(''); })}
            {nextBtn(loading ? 'Creating…' : 'Create Account', loading)}
          </div>
        </form>
      </Shell>
    );
  }

  /* ── Step 5: Success ── */
  return (
    <Shell step="success" stepIndex={4} totalSteps={4} title="Account submitted!" subtitle="Awaiting admin verification">
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-white/70 leading-relaxed">
              Your request for <span className="text-emerald-400">{email || 'your account'}</span> has been submitted.
            </p>
            <p className="text-xs text-white/40 mt-2 leading-relaxed">
              An administrator must approve your account before you can sign in. You will be notified once verified.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => router.push('/login')}
            className="px-5 py-2.5 bg-[#1E2D45] hover:bg-[#253550] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    </Shell>
  );
}

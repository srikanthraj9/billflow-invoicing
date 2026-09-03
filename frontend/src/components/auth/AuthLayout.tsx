import * as React from 'react';
import Link from 'next/link';
import { Receipt, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const highlights = [
    'Automated tax & discount calculations',
    'Zero-login public invoice links for clients',
    'Real-time overdue tracking & payment alerts',
    'Designed for freelancers, consultants & studios',
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row selection:bg-indigo-500 selection:text-white">
      {/* Left Brand Panel (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-12 lg:p-16 relative overflow-hidden border-r border-slate-800">
        {/* Ambient Gradient Glow */}
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl"
          aria-hidden="true"
        />

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 group inline-flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-transform group-hover:scale-105">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Bill<span className="text-indigo-400">Flow</span>
            </span>
          </Link>
        </div>

        {/* Middle Value Proposition */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Modern Invoicing Workspace</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Take the friction out of getting paid.
          </h1>

          <p className="text-slate-400 text-base leading-relaxed">
            Create professional invoices, share links with your clients, and keep track of every
            earned and overdue rupee from one clean dashboard.
          </p>

          <div className="space-y-3 pt-2">
            {highlights.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Trust Note */}
        <div className="relative z-10 pt-8 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span>Secure freelancer billing & payment tracking</span>
          </div>
          <span>© {new Date().getFullYear()} BillFlow</span>
        </div>
      </div>

      {/* Right Authentication Form Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12">
        {/* Mobile Header Logo */}
        <div className="lg:hidden w-full max-w-md mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Bill<span className="text-indigo-600">Flow</span>
            </span>
          </Link>
        </div>

        {/* Centered Auth Card Container */}
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

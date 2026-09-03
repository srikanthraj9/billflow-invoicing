import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function FinalCtaSection() {
  return (
    <section className="py-20 md:py-24 bg-gradient-to-b from-slate-900 to-indigo-950 text-white relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center -z-0 opacity-20"
        aria-hidden="true"
      >
        <div className="h-96 w-96 rounded-full bg-indigo-500 blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Get Started in Under 2 Minutes</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-2xl mx-auto leading-tight">
          Ready to simplify your invoicing?
        </h2>

        <p className="mt-4 text-base sm:text-lg text-indigo-200/90 max-w-xl mx-auto leading-relaxed">
          Create professional invoices, share links with your clients, and keep your payments
          organized with BillFlow.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-8 bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Get started free
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-indigo-400/30 bg-indigo-950/40 text-indigo-200 hover:bg-indigo-900/50 hover:text-white"
            >
              Sign in to demo
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-indigo-300/70">
          No credit card required • Instant setup • Cancel anytime
        </p>
      </div>
    </section>
  );
}

import * as React from 'react';
import Link from 'next/link';
import { Receipt } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <Receipt className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Bill<span className="text-indigo-600">Flow</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              BillFlow is a modern invoicing SaaS platform built for freelancers, consultants, and
              creative studios to streamline invoicing, track cashflow, and receive faster payments.
            </p>
            <p className="text-xs text-slate-400">
              Technical Assessment Build • Designed with Next.js, React & Tailwind CSS.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 block">
              Product
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#features" className="hover:text-indigo-600 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-indigo-600 transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-indigo-600 transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Company & Legal Links */}
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 block">
              Company & Legal
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-slate-400 cursor-not-allowed">About Us</span>
              </li>
              <li>
                <span className="text-slate-400 cursor-not-allowed">Contact Support</span>
              </li>
              <li>
                <span className="text-slate-400 cursor-not-allowed">Privacy Policy</span>
              </li>
              <li>
                <span className="text-slate-400 cursor-not-allowed">Terms of Service</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} BillFlow Invoicing Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-600 transition-colors">
              Sign In
            </Link>
            <span>•</span>
            <Link href="/signup" className="hover:text-slate-600 transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, Receipt } from 'lucide-react';

export interface MobileHeaderProps {
  onOpenMobileNav: () => void;
}

export function MobileHeader({ onOpenMobileNav }: MobileHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden sticky top-0 z-30">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
          <Receipt className="h-4 w-4" />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900">
          Bill<span className="text-indigo-600">Flow</span>
        </span>
      </Link>

      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
    </header>
  );
}

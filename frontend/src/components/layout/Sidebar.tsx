'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/services/authService';
import { User } from '@/lib/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Bank Accounts', href: '/bank-accounts', icon: Building2 },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    authService.getCurrentUser().then((u) => {
      if (isMounted) setUser(u);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
  };

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white min-h-screen shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2.5 focus:outline-none group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 group-hover:bg-indigo-700 transition-colors">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-slate-900 tracking-tight leading-none">
              BillFlow
            </span>
            <span className="text-[11px] text-slate-500 font-medium leading-tight">
              Invoicing Platform
            </span>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-50/90 text-indigo-700 font-semibold border border-indigo-100/70 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                )}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200/70" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Free Tier / Pro Indicator */}
      <div className="px-3.5 py-3 mx-3 mb-3 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>Freelancer Plan</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 leading-tight">
          Unlimited invoices & client links enabled.
        </p>
      </div>

      {/* User Footer */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center justify-between rounded-xl p-2 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100/80">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="truncate text-xs font-semibold text-slate-900">{user?.name || 'User'}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.businessName || user?.email || 'Freelancer'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

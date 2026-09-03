import * as React from 'react';
import Link from 'next/link';
import { Plus, Sparkles, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface WelcomeBannerProps {
  userName: string;
  businessName?: string;
}

export function WelcomeBanner({ userName, businessName }: WelcomeBannerProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {getGreeting()}, {userName.split(' ')[0]}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200/60">
            <Sparkles className="h-3 w-3" />
            <span>Workspace Active</span>
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {businessName ? `${businessName} • ` : ''}Here&apos;s an overview of your invoicing activity.
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <Link href="/invoices/new">
          <Button
            variant="primary"
            size="md"
            className="shadow-sm shadow-indigo-600/20"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create invoice
          </Button>
        </Link>
      </div>
    </div>
  );
}

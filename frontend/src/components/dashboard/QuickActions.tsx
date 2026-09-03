import * as React from 'react';
import Link from 'next/link';
import { Plus, UserPlus, FileText, Users, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export function QuickActions() {
  const actions = [
    {
      label: 'Create Invoice',
      description: 'Draft line items & send to client',
      href: '/invoices/new',
      icon: Plus,
      variant: 'indigo',
    },
    {
      label: 'Add Client',
      description: 'Save contact & billing details',
      href: '/clients/new',
      icon: UserPlus,
      variant: 'emerald',
    },
    {
      label: 'All Invoices',
      description: 'Filter by status, search & export',
      href: '/invoices',
      icon: FileText,
      variant: 'blue',
    },
    {
      label: 'Client Directory',
      description: 'Manage active customer accounts',
      href: '/clients',
      icon: Users,
      variant: 'neutral',
    },
  ];

  return (
    <Card className="border border-slate-200/90 bg-white shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-slate-900">Quick Actions</CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Fast shortcuts for frequent workspace tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <Link
                key={act.label}
                href={act.href}
                className="group flex items-start justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition-all hover:bg-indigo-50/40 hover:border-indigo-200"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {act.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{act.description}</p>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { CurrencyCode } from '@/lib/types';

export interface OverdueAlertProps {
  overdueAmount: number;
  overdueCount?: number;
  currency?: CurrencyCode;
}

export function OverdueAlert({
  overdueAmount,
  overdueCount = 1,
  currency = 'INR',
}: OverdueAlertProps) {
  if (overdueAmount <= 0) return null;

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
      <div className="flex items-start sm:items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="text-sm">
          <p className="font-semibold text-rose-950">
            You have {overdueCount} {overdueCount === 1 ? 'invoice' : 'invoices'} overdue totaling{' '}
            <span className="font-bold tabular-nums">
              {formatCurrency(overdueAmount, currency)}
            </span>
          </p>
          <p className="text-xs text-rose-700 mt-0.5">
            Payment due date has passed. Review and send a friendly reminder to your client.
          </p>
        </div>
      </div>

      <div className="shrink-0 pl-11 sm:pl-0">
        <Link href="/invoices?status=overdue">
          <Button
            variant="destructive"
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Review overdue
          </Button>
        </Link>
      </div>
    </div>
  );
}

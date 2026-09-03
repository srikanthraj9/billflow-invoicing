import * as React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export function PublicInvoiceSkeleton() {
  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-6 animate-in fade-in duration-150">
        {/* Top Navbar Skeleton */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        {/* Invoice Document Skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 space-y-8 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="space-y-2 text-right flex flex-col items-end">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-2 flex flex-col items-end">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>

          <div className="pt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

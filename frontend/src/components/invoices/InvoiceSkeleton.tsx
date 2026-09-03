import * as React from 'react';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';

export function InvoiceSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Filter Bar Skeleton */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
        <div className="flex justify-between items-center gap-4">
          <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/60">
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="divide-y divide-slate-100 p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Mobile Card Skeletons */}
      <div className="md:hidden space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

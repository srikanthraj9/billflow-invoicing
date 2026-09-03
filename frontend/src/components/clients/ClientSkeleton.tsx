import * as React from 'react';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';

export function ClientDirectorySkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Search Bar Skeleton */}
      <div className="flex justify-between items-center gap-4">
        <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg hidden sm:block" />
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

export function ClientFormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs animate-in fade-in duration-150">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-4 pt-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}

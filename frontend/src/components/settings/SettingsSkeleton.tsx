import * as React from 'react';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';

export function SettingsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="space-y-6">
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}

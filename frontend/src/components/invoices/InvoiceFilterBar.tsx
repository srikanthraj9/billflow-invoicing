import * as React from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Client, InvoiceFilters, InvoiceStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface InvoiceFilterBarProps {
  filters: InvoiceFilters;
  clients: Client[];
  totalCount: number;
  filteredCount: number;
  statusCounts?: Record<InvoiceStatus | 'all', number>;
  onFilterChange: (newFilters: Partial<InvoiceFilters>) => void;
  onClearFilters: () => void;
}

export function InvoiceFilterBar({
  filters,
  clients,
  totalCount,
  filteredCount,
  statusCounts,
  onFilterChange,
  onClearFilters,
}: InvoiceFilterBarProps) {
  const isFiltered = Boolean(
    filters.search ||
      (filters.status && filters.status !== 'all') ||
      filters.clientId
  );

  const statusTabs: { id: InvoiceStatus | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'sent', label: 'Sent' },
    { id: 'paid', label: 'Paid' },
    { id: 'overdue', label: 'Overdue' },
  ];

  const clientOptions = [
    { value: '', label: 'All clients' },
    ...clients.map((c) => ({
      value: c.id,
      label: c.company ? `${c.name} (${c.company})` : c.name,
    })),
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'highest_amount', label: 'Highest amount' },
    { value: 'lowest_amount', label: 'Lowest amount' },
    { value: 'due_date', label: 'Due date' },
  ];

  return (
    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
      {/* Top Row: Search & Count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="w-full sm:max-w-md">
          <SearchInput
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            onClear={() => onFilterChange({ search: '' })}
            placeholder="Search invoices by number, client, company..."
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500">
          <span className="font-semibold bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/60 text-slate-700">
            {isFiltered ? `${filteredCount} of ${totalCount} invoices` : `${totalCount} invoices`}
          </span>

          {isFiltered && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle Row: Status Filter Pills with Numerical Count Badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs border-t border-slate-100">
        {statusTabs.map((tab) => {
          const isActive = (filters.status || 'all') === tab.id;
          const count = statusCounts ? statusCounts[tab.id] : undefined;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange({ status: tab.id })}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer text-xs',
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              )}
            >
              <span>{tab.label}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums leading-none',
                    isActive ? 'bg-indigo-700/80 text-white' : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Filter Controls Row: Client & Sort Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-100">
        {/* Client Filter */}
        <Select
          value={filters.clientId || ''}
          onChange={(e) => onFilterChange({ clientId: e.target.value || undefined })}
          options={clientOptions}
          className="text-xs"
        />

        {/* Sort Filter */}
        <Select
          value={filters.sortBy || 'newest'}
          onChange={(e) =>
            onFilterChange({
              sortBy: e.target.value as InvoiceFilters['sortBy'],
            })
          }
          options={sortOptions}
          className="text-xs"
        />
      </div>
    </div>
  );
}

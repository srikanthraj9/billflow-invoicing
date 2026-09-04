'use client';

import * as React from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { MonthlyIncomePoint, CurrencyCode } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { dashboardService } from '@/lib/services/dashboardService';
import { invoiceService } from '@/lib/services/invoiceService';

export interface IncomeChartProps {
  data: MonthlyIncomePoint[];
  currency?: CurrencyCode;
}

const FULL_MONTH_NAMES: Record<string, string> = {
  Jan: 'January',
  Feb: 'February',
  Mar: 'March',
  Apr: 'April',
  May: 'May',
  Jun: 'June',
  Jul: 'July',
  Aug: 'August',
  Sep: 'September',
  Oct: 'October',
  Nov: 'November',
  Dec: 'December',
};

export function IncomeChart({ data, currency = 'INR' }: IncomeChartProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState<'6m' | '1y' | '30d'>('6m');
  const [hoveredPoint, setHoveredPoint] = React.useState<MonthlyIncomePoint | null>(null);
  const [chartData, setChartData] = React.useState<MonthlyIncomePoint[]>(data);
  const [isLoading, setIsLoading] = React.useState(false);

  // In-memory cache for period data to avoid unnecessary re-fetches
  const cachedPeriods = React.useRef<{
    '6m'?: MonthlyIncomePoint[];
    '1y'?: MonthlyIncomePoint[];
    '30d'?: MonthlyIncomePoint[];
  }>({ '6m': data });

  // Keep 6m data synchronized when initial props change
  React.useEffect(() => {
    cachedPeriods.current['6m'] = data;
    if (selectedPeriod === '6m') {
      setChartData(data);
    }
  }, [data, selectedPeriod]);

  // Handle switching between Last 6 Months, This Year, and Last 30 Days using real data
  const handlePeriodChange = React.useCallback(
    async (period: '6m' | '1y' | '30d') => {
      setSelectedPeriod(period);
      setHoveredPoint(null);

      // Return cached points if already calculated/fetched
      if (cachedPeriods.current[period]) {
        setChartData(cachedPeriods.current[period]!);
        return;
      }

      setIsLoading(true);
      try {
        if (period === '1y') {
          // Fetch 12-month rolling data directly from backend
          const stats12 = await dashboardService.getDashboardStats(12);
          cachedPeriods.current['1y'] = stats12.monthlyIncome;
          setChartData(stats12.monthlyIncome);
        } else if (period === '30d') {
          // Fetch real paid invoices to group into intervals across the last 30 days
          const paidInvoices = await invoiceService.getInvoices({ status: 'paid' });

          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

          // Build 6 buckets of 5 days each
          const bucketsCount = 6;
          const intervalMs = (now.getTime() - thirtyDaysAgo.getTime()) / bucketsCount;
          const points: MonthlyIncomePoint[] = [];

          for (let i = 0; i < bucketsCount; i++) {
            const bucketStart = new Date(thirtyDaysAgo.getTime() + i * intervalMs);
            const bucketEnd = new Date(thirtyDaysAgo.getTime() + (i + 1) * intervalMs);

            const startStr = bucketStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const label = i === bucketsCount - 1 ? 'Latest' : startStr;

            // Aggregate real paid invoices with paidAt timestamps falling inside this interval
            const bucketTotal = paidInvoices.reduce((acc, inv) => {
              if (!inv.paidAt) return acc;
              const paidTime = new Date(inv.paidAt).getTime();
              if (paidTime >= bucketStart.getTime() && paidTime <= bucketEnd.getTime()) {
                return acc + Number(inv.totalAmount || 0);
              }
              return acc;
            }, 0);

            points.push({
              month: label,
              year: bucketEnd.getFullYear(),
              amount: bucketTotal,
              formattedAmount: formatCurrency(bucketTotal, currency),
            });
          }

          cachedPeriods.current['30d'] = points;
          setChartData(points);
        }
      } catch {
        // Fall back gracefully to existing data if network or query fails
        setChartData(data);
      } finally {
        setIsLoading(false);
      }
    },
    [currency, data]
  );

  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1);
  const totalPeriodIncome = chartData.reduce((acc, curr) => acc + curr.amount, 0);

  const getFullPeriodLabel = (item: MonthlyIncomePoint): string => {
    const fullMonth = FULL_MONTH_NAMES[item.month] || item.month;
    return `${fullMonth} ${item.year}`;
  };

  return (
    <Card className="border border-slate-200/90 bg-white shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold text-slate-900">Income Over Time</CardTitle>
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              {selectedPeriod === '30d' ? '30-Day Trend' : 'Monthly Trend'}
            </span>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-1">
            Total collected revenue across selected period:{' '}
            <strong className="text-slate-900">{formatCurrency(totalPeriodIncome, currency)}</strong>
          </CardDescription>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => handlePeriodChange('6m')}
            disabled={isLoading}
            className={`rounded-md px-2.5 py-1 transition-all ${
              selectedPeriod === '6m'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Last 6 Months
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange('1y')}
            disabled={isLoading}
            className={`rounded-md px-2.5 py-1 transition-all ${
              selectedPeriod === '1y'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            This Year
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange('30d')}
            disabled={isLoading}
            className={`rounded-md px-2.5 py-1 transition-all ${
              selectedPeriod === '30d'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-6">
        {/* Active Hover / Info Banner */}
        <div className="h-6 mb-3 flex items-center justify-between text-xs">
          {hoveredPoint ? (
            <div className="flex items-center gap-2 text-indigo-700 font-semibold animate-in fade-in duration-100">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {getFullPeriodLabel(hoveredPoint)}: {formatCurrency(hoveredPoint.amount, currency)}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-[11px]">Hover over a column to view exact collected revenue</span>
          )}
          <span className="text-[11px] text-slate-400 hidden sm:inline-block">
            Peak: {formatCurrency(maxAmount, currency)}
          </span>
        </div>

        {/* Loading Indicator or Chart Column Visualizer */}
        {isLoading ? (
          <div className="h-48 sm:h-56 w-full flex items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Updating timeline...</span>
          </div>
        ) : (
          <div className="h-48 sm:h-56 w-full flex items-end justify-between gap-2 sm:gap-4 pt-4 border-b border-slate-100 pb-2">
            {chartData.map((item, index) => {
              const heightPercent =
                maxAmount > 0 && item.amount > 0
                  ? Math.max(10, Math.round((item.amount / maxAmount) * 100))
                  : 0;
              const isLatest = index === chartData.length - 1;
              const isHovered =
                hoveredPoint?.month === item.month && hoveredPoint?.year === item.year;

              return (
                <div
                  key={`${item.month}-${item.year}-${index}`}
                  onMouseEnter={() => setHoveredPoint(item)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                >
                  {/* Value tooltip pill on hover */}
                  <div
                    className={`mb-2 rounded-md bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap shadow-md shadow-slate-900/20 z-10 transition-all duration-150 ${
                      isHovered
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-1 scale-95 pointer-events-none'
                    }`}
                  >
                    {formatCurrency(item.amount, currency)}
                  </div>

                  {/* Bar Column Track */}
                  <div className="w-full max-w-[42px] h-28 sm:h-36 bg-slate-100/90 rounded-t-lg relative flex items-end overflow-hidden group-hover:bg-slate-200/60 transition-colors">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        item.amount > 0
                          ? isLatest
                            ? 'bg-indigo-600 shadow-sm shadow-indigo-600/30 group-hover:bg-indigo-700'
                            : isHovered
                            ? 'bg-indigo-500'
                            : 'bg-indigo-400 group-hover:bg-indigo-500'
                          : 'h-0'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    {/* Baseline indicator */}
                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-slate-200" />
                  </div>

                  {/* Month / Interval label */}
                  <div className="mt-3 text-center w-full">
                    <span
                      className={`text-xs block truncate ${
                        item.amount > 0
                          ? 'font-bold text-indigo-700'
                          : isHovered
                          ? 'font-semibold text-slate-900'
                          : 'text-slate-500'
                      }`}
                    >
                      {item.month}
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:block">
                      {item.year}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

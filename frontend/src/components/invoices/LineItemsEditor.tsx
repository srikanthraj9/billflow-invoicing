'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { Card, CardContent } from '@/components/ui/Card';
import { InvoiceItem, CurrencyCode } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export interface LineItemsEditorProps {
  items: InvoiceItem[];
  currency?: CurrencyCode;
  onChange: (items: InvoiceItem[]) => void;
  errors?: Record<number, { description?: string; quantity?: string; rate?: string }>;
  disabled?: boolean;
}

export function LineItemsEditor({
  items,
  currency = 'INR',
  onChange,
  errors = {},
  disabled = false,
}: LineItemsEditorProps) {
  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    const newItems = [...items];
    const current = { ...newItems[index] };

    if (field === 'description') {
      current.description = String(value);
    } else if (field === 'quantity') {
      const qty = parseFloat(String(value)) || 0;
      current.quantity = qty;
      current.amount = Math.round(qty * current.rate * 100) / 100;
    } else if (field === 'rate') {
      const rate = parseFloat(String(value)) || 0;
      current.rate = rate;
      current.amount = Math.round(current.quantity * rate * 100) / 100;
    }

    newItems[index] = current;
    onChange(newItems);
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `item_${Date.now()}_${items.length + 1}`,
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return; // Always keep at least 1 line item
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Line Items
        </h3>
        <span className="text-xs text-slate-400">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70">
              <TableHead className="w-[45%]">Description</TableHead>
              <TableHead className="w-28">Quantity</TableHead>
              <TableHead className="w-36">Rate ({currency})</TableHead>
              <TableHead className="text-right w-36">Amount</TableHead>
              <TableHead className="w-16 text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const itemError = errors[index];
              return (
                <TableRow key={item.id || index} className="align-top hover:bg-slate-50/50">
                  {/* Description */}
                  <TableCell className="py-3">
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="e.g. Website Design & Development"
                      error={itemError?.description}
                      disabled={disabled}
                      className="text-xs sm:text-sm"
                    />
                  </TableCell>

                  {/* Quantity */}
                  <TableCell className="py-3">
                    <Input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      placeholder="1"
                      error={itemError?.quantity}
                      disabled={disabled}
                      className="text-xs sm:text-sm tabular-nums"
                    />
                  </TableCell>

                  {/* Rate */}
                  <TableCell className="py-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate === 0 ? '' : item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      placeholder="0.00"
                      error={itemError?.rate}
                      disabled={disabled}
                      className="text-xs sm:text-sm tabular-nums"
                    />
                  </TableCell>

                  {/* Calculated Amount */}
                  <TableCell className="py-4 text-right font-bold text-slate-900 tabular-nums text-sm">
                    {formatCurrency(item.amount, currency)}
                  </TableCell>

                  {/* Remove Action */}
                  <TableCell className="py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={disabled || items.length <= 1}
                      className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                        items.length <= 1
                          ? 'text-slate-200 cursor-not-allowed'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title={items.length <= 1 ? 'At least one item is required' : 'Remove item'}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Stacked Cards View */}
      <div className="md:hidden space-y-3">
        {items.map((item, index) => {
          const itemError = errors[index];
          return (
            <Card key={item.id || index} className="border border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={disabled || items.length <= 1}
                    className={`text-xs font-semibold p-1 rounded transition-colors ${
                      items.length <= 1
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-rose-600 hover:text-rose-700'
                    }`}
                  >
                    Remove
                  </button>
                </div>

                {/* Description */}
                <Input
                  label="Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  placeholder="Service or product description"
                  error={itemError?.description}
                  disabled={disabled}
                />

                {/* Quantity & Rate */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Qty"
                    type="number"
                    min="0.01"
                    step="any"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    placeholder="1"
                    error={itemError?.quantity}
                    disabled={disabled}
                  />

                  <Input
                    label={`Rate (${currency})`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate === 0 ? '' : item.rate}
                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                    placeholder="0.00"
                    error={itemError?.rate}
                    disabled={disabled}
                  />
                </div>

                {/* Total Calculated Amount */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">Item Amount:</span>
                  <span className="font-bold text-slate-900 tabular-nums text-sm">
                    {formatCurrency(item.amount, currency)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Line Item Action */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddItem}
        disabled={disabled}
        leftIcon={<Plus className="h-4 w-4" />}
        className="w-full sm:w-auto text-indigo-600 border-dashed hover:border-indigo-300 hover:bg-indigo-50/50"
      >
        Add line item
      </Button>
    </div>
  );
}

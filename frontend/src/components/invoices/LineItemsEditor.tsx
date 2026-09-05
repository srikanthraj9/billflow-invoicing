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
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Line Items
        </h3>
        <span className="text-xs text-slate-400 tabular-nums font-medium">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 border-b border-slate-200">
              <TableHead className="w-[44%] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Description
              </TableHead>
              <TableHead className="w-24 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Quantity
              </TableHead>
              <TableHead className="w-36 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Rate ({currency})
              </TableHead>
              <TableHead className="text-right w-36 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Amount
              </TableHead>
              <TableHead className="w-12 text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const itemError = errors[index];
              return (
                <TableRow key={item.id || index} className="align-top hover:bg-slate-50/40 transition-colors">
                  {/* Description */}
                  <TableCell className="py-2.5">
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="e.g. Website Design & Development"
                      error={itemError?.description}
                      disabled={disabled}
                      className="text-xs sm:text-sm bg-slate-50/40 focus:bg-white border-slate-200 hover:border-slate-300 transition-colors"
                    />
                  </TableCell>

                  {/* Quantity */}
                  <TableCell className="py-2.5">
                    <Input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      placeholder="1"
                      error={itemError?.quantity}
                      disabled={disabled}
                      className="text-xs sm:text-sm text-center tabular-nums bg-slate-50/40 focus:bg-white border-slate-200 hover:border-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </TableCell>

                  {/* Rate */}
                  <TableCell className="py-2.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate === 0 ? '' : item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      placeholder="0.00"
                      error={itemError?.rate}
                      disabled={disabled}
                      leftIcon={
                        <span className="text-xs font-semibold text-slate-400 select-none">
                          {currency === 'INR' ? '₹' : currency}
                        </span>
                      }
                      className="text-xs sm:text-sm text-right tabular-nums bg-slate-50/40 focus:bg-white border-slate-200 hover:border-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </TableCell>

                  {/* Calculated Amount */}
                  <TableCell className="py-3.5 text-right font-bold text-slate-900 tabular-nums text-sm">
                    {formatCurrency(item.amount, currency)}
                  </TableCell>

                  {/* Remove Action */}
                  <TableCell className="py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={disabled || items.length <= 1}
                      className={`p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer ${
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
            <Card key={item.id || index} className="border border-slate-200/90 bg-white shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Item #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={disabled || items.length <= 1}
                    className={`text-xs font-semibold p-1 rounded transition-colors ${
                      items.length <= 1
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
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
                    className="tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    leftIcon={
                      <span className="text-xs font-semibold text-slate-400 select-none">
                        {currency === 'INR' ? '₹' : currency}
                      </span>
                    }
                    className="tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Total Calculated Amount */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Item Amount:</span>
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
        leftIcon={<Plus className="h-4 w-4 text-indigo-600" />}
        className="w-full sm:w-auto border-slate-200/90 hover:border-indigo-200 hover:bg-indigo-50/40 text-slate-700 hover:text-indigo-700 font-medium transition-colors shadow-2xs"
      >
        Add line item
      </Button>
    </div>
  );
}

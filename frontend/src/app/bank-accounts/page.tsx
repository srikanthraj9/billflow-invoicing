'use client';

import * as React from 'react';
import {
  Building2,
  Plus,
  CheckCircle2,
  Trash2,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  Star,
  Info,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useToast } from '@/components/ui/Toast';
import { mockPaymentService } from '@/lib/services/mockPaymentService';
import { BankAccount } from '@/lib/types/payments';
import { AddBankAccountModal } from '@/components/payments/AddBankAccountModal';
import { EmptyState } from '@/components/ui/EmptyState';

export default function BankAccountsPage() {
  const toast = useToast();

  const [accounts, setAccounts] = React.useState<BankAccount[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<BankAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = React.useState<BankAccount | null>(null);

  const loadAccounts = React.useCallback(() => {
    const list = mockPaymentService.getBankAccounts();
    setAccounts(list);
  }, []);

  React.useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSaveAccount = (data: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'Current' | 'Savings';
    isPrimary?: boolean;
  }) => {
    if (editingAccount) {
      mockPaymentService.updateBankAccount(editingAccount.id, {
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        ifscCode: data.ifscCode,
        accountType: data.accountType,
        isPrimary: data.isPrimary,
      });
    } else {
      mockPaymentService.addBankAccount(data);
    }
    loadAccounts();
    setEditingAccount(null);
  };

  const handleSetPrimary = (id: string) => {
    mockPaymentService.setPrimaryBankAccount(id);
    loadAccounts();
    toast.success('Primary Account Updated', 'Settlement account set as default.');
  };

  const handleDelete = () => {
    if (!accountToDelete) return;
    mockPaymentService.deleteBankAccount(accountToDelete.id);
    loadAccounts();
    toast.success('Account Removed', `${accountToDelete.bankName} removed from demo settlement accounts.`);
    setAccountToDelete(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Page Header */}
        <PageHeader
          title="Bank Accounts"
          description="Manage settlement account information used for your business profile."
          actions={
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setEditingAccount(null);
                setModalOpen(true);
              }}
              leftIcon={<Plus className="h-4 w-4" />}
              className="shadow-xs"
            >
              Add Bank Account
            </Button>
          }
        />

        {/* Demo Disclaimer Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">Demonstration Settlement Accounts &bull; Frontend Mock Data</span>
            <span className="text-indigo-700 hidden sm:inline">&bull; Never enter real banking credentials</span>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
            Local Demo State
          </span>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={`rounded-2xl bg-white p-6 border transition-all shadow-2xs hover:shadow-xs relative flex flex-col justify-between ${
                acc.isPrimary
                  ? 'border-indigo-200/90 ring-1 ring-indigo-500/10'
                  : 'border-slate-200/80'
              }`}
            >
              <div>
                {/* Card Top Row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-700">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 leading-tight">
                        {acc.bankName}
                      </h2>
                      <span className="text-xs text-slate-500 font-medium block mt-0.5">
                        {acc.accountHolderName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {acc.isPrimary && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Primary Account
                      </span>
                    )}
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                      {acc.accountType}
                    </span>
                  </div>
                </div>

                {/* Account Details Box */}
                <div className="rounded-xl bg-slate-50/60 p-3.5 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Account Number:</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {acc.accountNumberMasked}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">IFSC Code:</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {acc.ifscCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  {!acc.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(acc.id)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                    >
                      <Star className="h-3.5 w-3.5" />
                      <span>Set as Primary</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingAccount(acc);
                      setModalOpen(true);
                    }}
                    leftIcon={<Pencil className="h-3 w-3" />}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAccountToDelete(acc)}
                    leftIcon={<Trash2 className="h-3 w-3" />}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {accounts.length === 0 && (
          <EmptyState
            icon={Building2}
            title="No settlement bank accounts configured"
            description="Add your business bank account details to simulate automated settlement payouts."
            actionLabel="Add Bank Account"
            onAction={() => {
              setEditingAccount(null);
              setModalOpen(true);
            }}
          />
        )}
      </div>

      {/* Add / Edit Account Modal */}
      <AddBankAccountModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
        editingAccount={editingAccount}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleDelete}
        title="Remove Bank Account"
        description={`Are you sure you want to remove ${accountToDelete?.bankName} (${accountToDelete?.accountNumberMasked}) from your demonstration accounts?`}
        confirmText="Remove Account"
        variant="destructive"
      />
    </AppLayout>
  );
}

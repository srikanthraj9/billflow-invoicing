'use client';

import * as React from 'react';
import { Building2, ShieldAlert, Check, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { BankAccount } from '@/lib/types/payments';

export interface AddBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'Current' | 'Savings';
    isPrimary?: boolean;
  }) => void;
  editingAccount?: BankAccount | null;
}

export function AddBankAccountModal({
  isOpen,
  onClose,
  onSave,
  editingAccount,
}: AddBankAccountModalProps) {
  const toast = useToast();

  const [accountHolderName, setAccountHolderName] = React.useState('');
  const [bankName, setBankName] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = React.useState('');
  const [ifscCode, setIfscCode] = React.useState('');
  const [accountType, setAccountType] = React.useState<'Current' | 'Savings'>('Current');
  const [isPrimary, setIsPrimary] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (editingAccount) {
      setAccountHolderName(editingAccount.accountHolderName);
      setBankName(editingAccount.bankName);
      setAccountNumber('00001234'); // Placeholder demo number
      setConfirmAccountNumber('00001234');
      setIfscCode(editingAccount.ifscCode);
      setAccountType(editingAccount.accountType);
      setIsPrimary(editingAccount.isPrimary);
    } else {
      setAccountHolderName('BillFlow Technologies');
      setBankName('HDFC Bank');
      setAccountNumber('');
      setConfirmAccountNumber('');
      setIfscCode('HDFC0001234');
      setAccountType('Current');
      setIsPrimary(false);
    }
    setErrors({});
  }, [editingAccount, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required.';
    }
    if (!bankName.trim()) {
      newErrors.bankName = 'Bank name is required.';
    }
    if (!accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required.';
    } else if (accountNumber.length < 8) {
      newErrors.accountNumber = 'Account number must be at least 8 digits.';
    }
    if (accountNumber !== confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match.';
    }
    if (!ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required.';
    } else if (ifscCode.trim().length < 11) {
      newErrors.ifscCode = 'IFSC code must be 11 characters (e.g. HDFC0001234).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      accountHolderName: accountHolderName.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      accountType,
      isPrimary,
    });

    toast.success(
      editingAccount ? 'Account Updated' : 'Bank Account Added',
      `${bankName} saved to demonstration settlement accounts.`
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingAccount ? 'Edit Settlement Account' : 'Add Bank Account'}
      description="Manage demo settlement bank details for invoice payouts."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Demo Disclaimer */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            Demonstration mode: Account details are stored purely in browser local state. Never enter real banking credentials or passwords.
          </span>
        </div>

        <div className="space-y-3">
          <Input
            label="Account Holder Name"
            placeholder="e.g. BillFlow Technologies"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            error={errors.accountHolderName}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Bank Name"
              placeholder="e.g. HDFC Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              error={errors.bankName}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Current', 'Savings'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                      accountType === type
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Account Number"
              type="password"
              placeholder="Enter account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              error={errors.accountNumber}
              required
            />

            <Input
              label="Confirm Account Number"
              type="password"
              placeholder="Re-enter account number"
              value={confirmAccountNumber}
              onChange={(e) => setConfirmAccountNumber(e.target.value)}
              error={errors.confirmAccountNumber}
              required
            />
          </div>

          <Input
            label="IFSC Code"
            placeholder="e.g. HDFC0001234"
            value={ifscCode}
            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
            error={errors.ifscCode}
            required
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPrimaryAccount"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="isPrimaryAccount" className="text-xs text-slate-700 font-medium cursor-pointer">
              Set as primary settlement account
            </label>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            leftIcon={editingAccount ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          >
            {editingAccount ? 'Save Changes' : 'Add Bank Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

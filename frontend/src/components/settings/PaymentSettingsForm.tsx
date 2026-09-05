'use client';

import * as React from 'react';
import { QrCode, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { mockPaymentService } from '@/lib/services/mockPaymentService';
import { UpiSettings } from '@/lib/types/payments';

export function PaymentSettingsForm() {
  const toast = useToast();

  const [settings, setSettings] = React.useState<UpiSettings>({
    upiId: 'business@upi',
    businessDisplayName: 'BillFlow Technologies',
    acceptUpi: true,
  });
  const [isSaved, setIsSaved] = React.useState(false);

  React.useEffect(() => {
    const saved = mockPaymentService.getUpiSettings();
    setSettings(saved);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    mockPaymentService.saveUpiSettings(settings);
    setIsSaved(true);
    toast.success('UPI Settings Saved', 'Demo UPI configuration updated in local state.');
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <QrCode className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">UPI Payments</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Configure UPI ID and display name used on customer invoice payment checkouts.
          </p>
        </div>

        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
          Demo Config
        </span>
      </div>

      {/* Honest Demo Notice */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 flex items-start gap-2 mb-5">
        <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          Demo payment configuration — Stored locally for demonstration. Does not connect to banking switches or alter backend settings contracts.
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Input
          label="UPI ID / VPA"
          placeholder="e.g. business@upi"
          value={settings.upiId}
          onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
          required
        />

        <Input
          label="Business Display Name"
          placeholder="e.g. BillFlow Technologies"
          value={settings.businessDisplayName}
          onChange={(e) => setSettings({ ...settings, businessDisplayName: e.target.value })}
          required
        />

        {/* Accept UPI Toggle */}
        <div className="flex items-center justify-between pt-2 pb-1 border-t border-slate-100">
          <div>
            <label htmlFor="acceptUpiToggle" className="text-xs font-semibold text-slate-900 block">
              Accept UPI Payments
            </label>
            <span className="text-xs text-slate-500 block">
              Show UPI QR and VPA options on public invoice portal
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="acceptUpiToggle"
              checked={settings.acceptUpi}
              onChange={(e) => setSettings({ ...settings, acceptUpi: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
          </label>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            leftIcon={isSaved ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : undefined}
          >
            {isSaved ? 'Saved locally' : 'Save UPI Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}

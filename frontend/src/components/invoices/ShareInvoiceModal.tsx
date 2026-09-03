'use client';

import * as React from 'react';
import { Copy, Check, ExternalLink, Mail, Globe, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Invoice } from '@/lib/types';

export interface ShareInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export function ShareInvoiceModal({ isOpen, onClose, invoice }: ShareInvoiceModalProps) {
  const toast = useToast();
  const [copied, setCopied] = React.useState(false);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);

  const [origin, setOrigin] = React.useState('http://localhost:3000');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const publicUrl = `${origin}/public/invoice/${invoice.token || invoice.id}`;

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = publicUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success('Link Copied', 'Public invoice URL copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy Failed', 'Please manually select and copy the link.');
    }
  };

  const handleSimulateEmail = () => {
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      toast.success(
        'Email Reminder Sent',
        `Simulated payment invoice email sent to ${invoice.clientEmail || invoice.clientName}.`
      );
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Invoice"
      description="Anyone with this secure link can view and pay this invoice without logging in."
      maxWidth="md"
    >
      <div className="space-y-5 pt-2">
        {/* Public Link Copy Section */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Public Invoice Link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <Input
                value={publicUrl}
                readOnly
                className="bg-slate-50 font-mono text-xs text-slate-700 select-all"
                leftIcon={<Globe className="h-4 w-4 text-slate-400" />}
              />
            </div>
            <Button
              type="button"
              variant={copied ? 'outline' : 'primary'}
              size="md"
              onClick={handleCopyLink}
              leftIcon={copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              className="shrink-0"
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="rounded-xl bg-indigo-50/60 p-3.5 border border-indigo-100/80 text-xs text-indigo-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-800">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Client Portal Features:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-indigo-700/90 pl-1 text-[11px]">
            <li>No login or password required for client</li>
            <li>Instant simulated card payments</li>
            <li>Clean, responsive mobile layout & printable view</li>
          </ul>
        </div>

        {/* Secondary Actions */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            <span>Preview Client Portal</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSimulateEmail}
            isLoading={isSendingEmail}
            leftIcon={<Mail className="h-3.5 w-3.5 text-slate-500" />}
            className="text-xs"
          >
            Send email reminder
          </Button>
        </div>
      </div>
    </Modal>
  );
}

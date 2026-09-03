'use client';

import * as React from 'react';
import { Mail, Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = '',
}: ForgotPasswordModalProps) {
  const toast = useToast();
  const [email, setEmail] = React.useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Invalid Email', 'Please provide a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      toast.info(
        'Password Reset Simulated',
        `If an account exists for ${email}, a reset link has been dispatched.`
      );
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset your password"
      description="Enter your registered email address and we will send you password reset instructions."
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />

        <div className="rounded-lg bg-indigo-50 p-3 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
          <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <span>
            <strong>Demo Tip:</strong> You can log in immediately using the demo account{' '}
            <code className="rounded bg-indigo-100/80 px-1 py-0.5 font-mono text-indigo-800">
              demo@billflow.app
            </code>{' '}
            with any 8+ character password.
          </span>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Send Reset Link
          </Button>
        </div>
      </form>
    </Modal>
  );
}

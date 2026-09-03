'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { PasswordInput } from './PasswordInput';
import { authService } from '@/lib/services/authService';

export function SignupForm() {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [agreeTerms, setAgreeTerms] = React.useState(false);

  const [errors, setErrors] = React.useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    general?: string;
  }>({});

  const [isLoading, setIsLoading] = React.useState(false);

  const validate = () => {
    const errs: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    if (!name.trim()) {
      errs.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters.';
    }

    if (!email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm your password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (!agreeTerms) {
      errs.terms = 'You must accept the Terms and Privacy Policy.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      await authService.signup({ name, email, password });
      toast.success('Account Created!', `Welcome to BillFlow, ${name}!`);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setErrors({ general: message });
      toast.error('Registration Failed', message);
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-slate-200/90 shadow-xl shadow-slate-900/5 bg-white">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
          Create your BillFlow account
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Start managing your clients and invoices in one place.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* General Error Banner */}
        {errors.general && (
          <div
            className="rounded-lg bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 animate-in fade-in duration-150"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{errors.general}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <Input
            label="Full name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Alex Morgan"
            leftIcon={<UserIcon className="h-4 w-4" />}
            error={errors.name}
            disabled={isLoading}
            required
            autoComplete="name"
          />

          {/* Email */}
          <Input
            label="Work email address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="you@company.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email}
            disabled={isLoading}
            required
            autoComplete="email"
          />

          {/* Password */}
          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="••••••••"
            error={errors.password}
            disabled={isLoading}
            required
            autoComplete="new-password"
          />

          {/* Confirm Password */}
          <PasswordInput
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            placeholder="••••••••"
            error={errors.confirmPassword}
            disabled={isLoading}
            required
            autoComplete="new-password"
          />

          {/* Terms & Conditions Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-slate-600">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                }}
                disabled={isLoading}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>
                I agree to the{' '}
                <a href="#terms" className="font-medium text-indigo-600 hover:text-indigo-700 underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#privacy" className="font-medium text-indigo-600 hover:text-indigo-700 underline">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            {errors.terms && <p className="mt-1 text-xs font-medium text-rose-600">{errors.terms}</p>}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center shadow-md shadow-indigo-600/10 mt-2"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Create free account
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-slate-100 pt-5 pb-5 text-xs text-slate-500">
        <span>Already have an account?</span>
        <Link
          href="/login"
          className="ml-1.5 font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none focus:underline"
        >
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

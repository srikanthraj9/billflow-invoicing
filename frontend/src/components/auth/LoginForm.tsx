'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { PasswordInput } from './PasswordInput';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { authService } from '@/lib/services/authService';

export function LoginForm() {
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [errors, setErrors] = React.useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = React.useState(false);

  const validate = () => {
    const errs: { email?: string; password?: string } = {};

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
      await authService.login(email, password);
      toast.success('Signed In Successfully', `Welcome back, ${email}!`);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password.';
      setErrors({ general: message });
      toast.error('Authentication Failed', message);
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@billflow.app');
    setPassword('Demo1234!');
    setErrors({});
    toast.info('Demo Credentials Loaded', 'Pre-filled demo credentials.');
  };

  return (
    <>
      <Card className="border border-slate-200/90 shadow-xl shadow-slate-900/5 bg-white">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Sign in to your BillFlow account to manage clients and invoices.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Demo Credentials Pill */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs">
            <div className="flex items-center gap-1.5 text-indigo-900 font-medium">
              <Zap className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span>Demo freelancer account ready</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline underline-offset-2"
            >
              Fill Demo
            </button>
          </div>

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
            {/* Email Input */}
            <Input
              label="Email address"
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

            {/* Password Input */}
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
              autoComplete="current-password"
            />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                className="font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus:underline"
              >
                Forgot password?
              </button>
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
              Sign in to BillFlow
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-100 pt-5 pb-5 text-xs text-slate-500">
          <span>Don&apos;t have an account?</span>
          <Link
            href="/signup"
            className="ml-1.5 font-semibold text-indigo-600 hover:text-indigo-700 focus:outline-none focus:underline"
          >
            Create account
          </Link>
        </CardFooter>
      </Card>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        initialEmail={email}
      />
    </>
  );
}

import * as React from 'react';
import {
  FileText,
  Users,
  Clock,
  Share2,
  BarChart3,
  Briefcase,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export function FeaturesSection() {
  const features = [
    {
      icon: FileText,
      title: 'Professional Invoices',
      description:
        'Create beautifully formatted invoices with dynamic line items, automated tax % and discount calculations, and customizable terms.',
    },
    {
      icon: Users,
      title: 'Client Management',
      description:
        'Keep all your customer profiles, companies, billing addresses, and invoice histories neatly organized in one centralized directory.',
    },
    {
      icon: Clock,
      title: 'Payment & Overdue Tracking',
      description:
        'Track every invoice through its lifecycle (Draft, Sent, Paid, Overdue). Invoices automatically flag as overdue when due dates pass.',
    },
    {
      icon: Share2,
      title: 'Shareable Public Links',
      description:
        'Give clients a seamless experience. They can review line items, download PDFs, and pay directly through a unique link without creating an account.',
    },
    {
      icon: BarChart3,
      title: 'Financial Dashboard',
      description:
        'Understand your financial health at a glance with live totals for earned revenue, pending payments, overdue amounts, and monthly trends.',
    },
    {
      icon: Briefcase,
      title: 'Built for Independent Businesses',
      description:
        'Tailored specifically for freelancers, consultants, and boutique studios who need speed and clarity rather than bloated enterprise software.',
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">
            Features
          </h2>
          <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to invoice with confidence.
          </p>
          <p className="mt-4 text-base text-slate-600">
            A complete set of tools designed to help you create invoices, get paid on time, and
            keep your business cashflow healthy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card
                key={i}
                className="group border border-slate-200/80 bg-white p-6 sm:p-7 transition-all hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-600/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60 mb-5 transition-transform group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 mb-2">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

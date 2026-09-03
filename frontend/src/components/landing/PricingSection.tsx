import * as React from 'react';
import Link from 'next/link';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function PricingSection() {
  const tiers = [
    {
      name: 'Starter',
      price: '₹0',
      period: 'forever free',
      description: 'Ideal for independent freelancers and individual contractors getting started.',
      features: [
        'Up to 5 active client profiles',
        'Unlimited draft and sent invoices',
        'Automatic tax & discount calculations',
        'Shareable zero-login public invoice links',
        'Standard dashboard financial overview',
        'PDF invoice download & print layout',
      ],
      cta: 'Get started free',
      href: '/signup',
      highlighted: false,
    },
    {
      name: 'Professional Studio',
      price: '₹799',
      period: 'per month (demo tier)',
      description: 'For growing studios, agencies, and consultants who need custom branding.',
      features: [
        'Unlimited active client profiles',
        'Custom business logo & branding on invoices',
        'Custom invoice numbering prefix (e.g. ACME-)',
        'Automatic overdue tracking & payment reminders',
        'Detailed income trend analytics & reporting',
        'Multi-currency support (INR, USD, EUR, GBP)',
        'Priority feature roadmap access',
      ],
      cta: 'Start Pro trial',
      href: '/signup',
      highlighted: true,
      badge: 'Most Popular',
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 bg-slate-100/50 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">
            Pricing
          </h2>
          <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Transparent plans for independent businesses.
          </p>
          <p className="mt-4 text-base text-slate-600">
            Start completely free. Upgrade anytime as your client roster and invoicing volume scale.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            * All pricing displayed is illustrative for assessment demonstration purposes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl bg-white p-8 flex flex-col justify-between transition-all ${
                tier.highlighted
                  ? 'border-2 border-indigo-600 shadow-xl shadow-indigo-600/10 relative'
                  : 'border border-slate-200/90 shadow-sm'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3.5 py-0.5 text-xs font-bold text-white shadow-xs">
                  {tier.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
                  {tier.highlighted && <Sparkles className="h-5 w-5 text-indigo-600" />}
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">{tier.description}</p>

                <div className="mt-6 flex items-baseline gap-1.5 pb-6 border-b border-slate-100">
                  <span className="text-4xl font-extrabold text-slate-900 tabular-nums">
                    {tier.price}
                  </span>
                  <span className="text-xs font-medium text-slate-500">/ {tier.period}</span>
                </div>

                <div className="mt-6 space-y-3.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    What’s included:
                  </span>
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mt-0.5">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link href={tier.href} className="w-full block">
                  <Button
                    variant={tier.highlighted ? 'primary' : 'outline'}
                    size="lg"
                    className="w-full justify-center"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

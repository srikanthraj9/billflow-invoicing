import * as React from 'react';
import { UserPlus, FilePlus2, Send, ArrowRight } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      icon: UserPlus,
      title: 'Add your client',
      description:
        'Save your client’s name, email, company, and billing address once. They are instantly ready for recurring or one-off invoices.',
    },
    {
      step: '02',
      icon: FilePlus2,
      title: 'Build your invoice',
      description:
        'Add itemized tasks or deliverables with quantities and rates. Subtotals, taxes, and discounts compute automatically with zero math.',
    },
    {
      step: '03',
      icon: Send,
      title: 'Share link & get paid',
      description:
        'Dispatch your invoice via email or generate a secure public link. Clients can open, download PDF, and pay without registering.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-slate-100/50 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">
            How It Works
          </h2>
          <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From project completion to payment in 3 simple steps.
          </p>
          <p className="mt-4 text-base text-slate-600">
            BillFlow eliminates billing friction so you can focus on delivering great client work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="relative rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between group hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-black text-indigo-600/30 tabular-nums">
                      {item.step}
                    </span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-indigo-600 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Learn more</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

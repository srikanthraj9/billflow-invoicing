'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: 'What is BillFlow?',
    answer:
      'BillFlow is a modern SaaS invoicing platform created specifically for freelancers, consultants, and independent agencies. It replaces spreadsheet chaos with automated calculations, client directory management, shareable invoice links, and clear cashflow analytics.',
  },
  {
    question: 'Who is BillFlow for?',
    answer:
      'BillFlow is built for independent developers, designers, writers, consultants, boutique creative studios, and small agencies who want professional invoicing without the bloat and complexity of enterprise accounting software.',
  },
  {
    question: 'Can clients view and pay invoices without creating an account?',
    answer:
      'Yes! Every invoice generates a unique, secure public link. When you share this link with your client, they can review line items, download a clean PDF, and complete payment directly in their browser without signing up or logging in.',
  },
  {
    question: 'How does automatic overdue tracking work?',
    answer:
      'When you create an invoice, you set an issue date and a due date. If the due date passes and the invoice has not been settled, BillFlow automatically flags the status as "Overdue" and highlights it in your financial dashboard so you know exactly which payments require follow-up.',
  },
  {
    question: 'Can I customize my business information and invoice branding?',
    answer:
      'Absolutely. In the Settings section, you can configure your business name, billing address, contact phone, default currency (INR, USD, EUR, GBP), business logo, and custom invoice prefix (such as "INV", "ACME-", or "BF-"). All customizations reflect directly across client-facing invoices.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-white border-t border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to know.
          </p>
          <p className="mt-4 text-base text-slate-600">
            Got questions about how BillFlow works? Find quick answers to common queries below.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-white transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="flex w-full items-center justify-between p-5 text-left text-base font-semibold text-slate-900 hover:text-indigo-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-slate-400 shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180 text-indigo-600'
                    )}
                  />
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${index}`}
                    className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3 animate-in fade-in duration-150"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

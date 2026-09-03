import * as React from 'react';
import { XCircle, CheckCircle2, FileSpreadsheet, Sparkles } from 'lucide-react';

export function ProblemSolutionSection() {
  const problems = [
    {
      title: 'Manual calculations & reused invoice numbers',
      description:
        'Spreadsheets and Word templates frequently lead to accidental number collisions and calculation errors.',
    },
    {
      title: 'Scattered client billing records',
      description:
        'Client contact information, payment terms, and past history get lost across email threads and notes.',
    },
    {
      title: 'Difficulty tracking unpaid & overdue invoices',
      description:
        'Without automated status indicators, finding which invoices are past due requires tedious manual checking.',
    },
    {
      title: 'Friction in client payment experience',
      description:
        'Forcing clients to download attachments or register for third-party portals slows down payment turnaround.',
    },
  ];

  const solutions = [
    {
      title: 'Automated math & sequential invoice numbering',
      description:
        'Dynamic subtotal, tax %, and discount calculations with customizable prefix sequences.',
    },
    {
      title: 'Centralized client CRM & history',
      description:
        'All client details, companies, addresses, and associated invoices organized in one secure place.',
    },
    {
      title: 'Real-time status & automatic overdue detection',
      description:
        'Invoices automatically flag as overdue when due dates pass, keeping your cashflow visible at a glance.',
    },
    {
      title: 'Zero-login public invoice & payment links',
      description:
        'Clients can view itemized invoices, download PDFs, and pay directly through a secure link without logging in.',
    },
  ];

  return (
    <section className="py-20 bg-slate-100/60 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">
            Why BillFlow?
          </h2>
          <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Invoicing shouldn’t feel like tedious administrative work.
          </p>
          <p className="mt-4 text-base text-slate-600">
            Stop juggling spreadsheets and manually tracking who has paid. BillFlow turns chaotic
            billing into a seamless, automated workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Traditional Invoicing Pain Points */}
          <div className="rounded-2xl border border-rose-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">The Traditional Way</h3>
                <p className="text-xs text-slate-500">Spreadsheets, documents, and manual follow-ups</p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {problems.map((p, i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{p.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* The BillFlow Solution */}
          <div className="rounded-2xl border border-indigo-200 bg-white p-6 sm:p-8 shadow-md shadow-indigo-600/5 ring-1 ring-indigo-500/10">
            <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">The BillFlow Way</h3>
                <p className="text-xs text-indigo-600 font-medium">Clean, automated, and professional</p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {solutions.map((s, i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{s.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

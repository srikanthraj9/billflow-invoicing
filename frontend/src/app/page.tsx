import * as React from 'react';
import {
  LandingHeader,
  HeroSection,
  ProblemSolutionSection,
  FeaturesSection,
  HowItWorksSection,
  InvoicePreviewSection,
  PricingSection,
  FaqSection,
  FinalCtaSection,
  LandingFooter,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* 1. Public Navigation Header */}
      <LandingHeader />

      {/* 2. Main Landing Page Sections */}
      <main className="flex-1">
        {/* Hero Section & Interactive Dashboard Preview */}
        <HeroSection />

        {/* Problem vs Solution Comparison */}
        <ProblemSolutionSection />

        {/* Core Product Features Grid */}
        <FeaturesSection />

        {/* 3-Step "How It Works" Workflow */}
        <HowItWorksSection />

        {/* Static Client-Facing Invoice Preview */}
        <InvoicePreviewSection />

        {/* Clean SaaS Pricing Presentation */}
        <PricingSection />

        {/* Accessible FAQ Accordion */}
        <FaqSection />

        {/* High-Converting Final Call to Action */}
        <FinalCtaSection />
      </main>

      {/* 3. Footer */}
      <LandingFooter />
    </div>
  );
}

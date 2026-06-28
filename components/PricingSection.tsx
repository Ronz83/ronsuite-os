'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const tiers = [
  {
    label: 'Tier 0',
    name: 'Starter OS',
    price: '$0',
    priceSuffix: '',
    desc: 'Run the basics. See what\'s possible.',
    cta: 'Get Your Free Account',
    highlighted: false,
    features: [
      '500 Contacts',
      '1 Sales Pipeline',
      '1 Calendar',
      'Funnel Builder',
      'Forms & Surveys',
      'Web Chat Widget',
      '20 Social Posts/Month',
      '10 Email Review Requests/Month',
      '500 Emails/Month',
      'Proposals, Contracts & e-Signature',
      'Google Integration',
      'NWS Knowledge Base & Walkthroughs',
    ],
  },
  {
    label: 'Tier 1',
    name: 'Growth OS',
    price: '$299',
    priceSuffix: '/mo',
    desc: 'The full operating system for growing businesses.',
    cta: 'Get Growth OS',
    highlighted: true,
    features: [
      'Everything in Starter',
      '2,500 Contacts',
      '5 Pipelines & Calendars',
      '2 AI Agents (Chat + Voice)',
      'AI Appointment Booking',
      'AI Review Response Agent',
      '5 Automation Workflows',
      '2,500 Emails/Month',
      '50 Review Requests/Month',
      '100 Social Posts/Month',
      'Website Builder & Landing Pages',
      'Full Payments Suite (Stripe)',
      'Full Reporting Dashboard',
      'Zapier, API & Webhooks',
      '10 User Seats',
      'Technical Support',
    ],
  },
  {
    label: 'Tier 2',
    name: 'Professional OS',
    price: '$799',
    priceSuffix: '/mo',
    desc: 'Scale operations with advanced AI and automation.',
    cta: 'Get Professional OS',
    highlighted: false,
    features: [
      'Everything in Growth',
      '5,000 Contacts',
      '10 Pipelines / 20 Calendars',
      '10 AI Agents',
      '20 Automation Workflows',
      'Custom Workflow Builds (by NWS)',
      '5,000 Emails/Month',
      '200 Review Requests/Month',
      '250 Social Posts/Month',
      '100 User Seats',
      'Priority Support SLA',
    ],
  },
  {
    label: 'Tier 3',
    name: 'Enterprise OS',
    price: '$1,499',
    priceSuffix: '/mo',
    desc: 'Unlimited power for ambitious organizations.',
    cta: 'Talk to Us',
    highlighted: false,
    features: [
      'Everything in Professional',
      'Unlimited Contacts, Pipelines & Calendars',
      'Unlimited AI Agents & Workflows',
      'Unlimited Emails, Posts & User Seats',
      'Custom AI Agent Personality & Branding',
      'Priority Support',
    ],
  },
];

export default function PricingSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Choose Your Intelligence Tier</h2>
          <p className="text-slate-400">Start free. Scale as you grow. Pay only for what you use.</p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6">
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-3xl border overflow-hidden flex flex-col ${
                tier.highlighted
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {tier.highlighted && (
                <>
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
                    Most Popular
                  </div>
                </>
              )}

              <div className="p-7 flex flex-col flex-1">
                <div className="mb-6">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">{tier.label}</span>
                  <h3 className="text-xl font-bold text-white mt-1 mb-2">{tier.name}</h3>
                  <p className="text-slate-400 text-sm min-h-[2.5rem]">{tier.desc}</p>
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  {tier.priceSuffix && (
                    <span className="text-slate-500 text-base font-normal ml-1">{tier.priceSuffix}</span>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    tier.highlighted
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

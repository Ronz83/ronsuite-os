'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Create Your Free Account',
    desc: 'Sign up in 60 seconds. No credit card required. Your business account is ready instantly.',
  },
  {
    number: '02',
    title: 'Your System Is Pre-Built',
    desc: 'We deploy a complete business operating system into your account the moment you sign up. Fully configured, ready to use.',
  },
  {
    number: '03',
    title: 'Unlock What You Need',
    desc: 'Start with the free essentials. Upgrade individual features as your business grows — only pay for what you use.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            From zero to a fully operating business system in three simple steps.
          </p>
        </motion.div>

        <div className="relative grid lg:grid-cols-3 gap-8">
          {/* Connecting line — desktop only */}
          <div className="hidden lg:block absolute top-[3.25rem] left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-[2px] bg-gradient-to-r from-indigo-500/40 via-purple-500/40 to-indigo-500/40 z-0" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative z-10 rounded-3xl border border-white/10 bg-white/5 p-8 flex flex-col items-start backdrop-blur-sm hover:border-indigo-500/30 transition-colors"
            >
              {/* Numbered circle */}
              <div className="w-14 h-14 rounded-full bg-indigo-500/15 border-2 border-indigo-500/50 flex items-center justify-center mb-6 flex-shrink-0">
                <span className="text-indigo-400 font-bold text-lg">{step.number}</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

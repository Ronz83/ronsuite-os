'use client';

import { motion } from 'framer-motion';
import { Building2, UtensilsCrossed, Stethoscope, HardHat } from 'lucide-react';

const industries = [
  {
    Icon: Building2,
    name: 'Real Estate OS',
    desc: 'Lead capture, buyer/seller nurture, automated follow-up sequences',
  },
  {
    Icon: UtensilsCrossed,
    name: 'Hospitality OS',
    desc: 'Reservation management, guest follow-up, reputation automation',
  },
  {
    Icon: Stethoscope,
    name: 'Medical & Clinic OS',
    desc: 'Patient intake, appointment reminders, HIPAA-aligned workflows',
  },
  {
    Icon: HardHat,
    name: 'Construction OS',
    desc: 'Quote requests, project pipelines, client communication automation',
  },
];

export default function AppMarketplace() {
  return (
    <section className="py-24 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Industry Operating Systems</h2>
          <p className="text-slate-400 text-lg">
            Purpose-built for your sector. Add any OS to your account for{' '}
            <span className="text-indigo-400 font-semibold">$97/month</span>.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {industries.map(({ Icon, name, desc }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-3xl border border-white/10 bg-white/5 p-7 flex flex-col gap-4 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/25 transition-colors">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-white text-lg mb-1">{name}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>

              {/* Tag */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-slate-400 text-xs font-medium">
                  $97/mo add-on
                </span>
              </div>

              <button className="w-full py-2.5 rounded-xl border border-indigo-500/40 text-indigo-400 text-sm font-semibold hover:bg-indigo-500/10 transition-colors">
                Add to My Account
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

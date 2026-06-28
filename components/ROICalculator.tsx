'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ChevronRight } from 'lucide-react';

function formatCurrency(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
}

function SliderInput({ label, value, min, max, step, prefix, suffix, onChange }: SliderInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-400 font-medium">{label}</label>
        <span className="text-white font-bold text-sm">
          {prefix}{value.toLocaleString()}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-slate-600">
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  );
}

export default function ROICalculator() {
  const [leads, setLeads] = useState(50);
  const [closeRate, setCloseRate] = useState(20);
  const [avgValue, setAvgValue] = useState(500);
  const [missedCalls, setMissedCalls] = useState(15);

  const revenueCapturing = leads * (closeRate / 100) * avgValue;
  const revenueMissing = ((leads * (1 - closeRate / 100)) + missedCalls) * avgValue * 0.3;
  const monthlyUplift = revenueMissing * 0.4;
  const annualOpportunity = monthlyUplift * 12;

  const results = [
    { label: 'Revenue You\'re Capturing', value: revenueCapturing, color: 'text-emerald-400' },
    { label: 'Revenue You\'re Missing', value: revenueMissing, color: 'text-amber-400' },
    { label: 'Monthly Uplift Potential', value: monthlyUplift, color: 'text-indigo-400' },
    { label: 'Annual Opportunity', value: annualOpportunity, color: 'text-purple-400', large: true },
  ];

  return (
    <section className="py-24 px-6 border-t border-white/5 bg-black/20">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
            <TrendingUp className="w-4 h-4" />
            ROI Calculator
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">See What You&apos;re Leaving on the Table</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Adjust your numbers and watch the opportunity reveal itself in real time.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Inputs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-white/10 bg-white/5 p-8 space-y-8"
          >
            <h3 className="font-semibold text-white text-lg">Your Business Numbers</h3>
            <SliderInput
              label="Monthly Leads"
              value={leads}
              min={5}
              max={500}
              step={5}
              onChange={setLeads}
            />
            <SliderInput
              label="Close Rate"
              value={closeRate}
              min={1}
              max={80}
              step={1}
              suffix="%"
              onChange={setCloseRate}
            />
            <SliderInput
              label="Avg. Customer Value"
              value={avgValue}
              min={100}
              max={10000}
              step={100}
              prefix="$"
              onChange={setAvgValue}
            />
            <SliderInput
              label="Missed Calls / Month"
              value={missedCalls}
              min={0}
              max={100}
              step={1}
              onChange={setMissedCalls}
            />
          </motion.div>

          {/* Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            {results.map(({ label, value, color, large }, i) => (
              <motion.div
                key={i}
                layout
                className={`rounded-3xl border p-6 ${
                  large
                    ? 'border-indigo-500/40 bg-indigo-500/5'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <p className="text-slate-400 text-sm mb-1">{label}</p>
                <p className={`font-bold ${color} ${large ? 'text-5xl' : 'text-3xl'}`}>
                  {formatCurrency(value)}
                </p>
                {large && <p className="text-slate-500 text-xs mt-1">per year</p>}
              </motion.div>
            ))}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="pt-2"
            >
              <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25">
                Start Capturing This Revenue — Get Your Free Account
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

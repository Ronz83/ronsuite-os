'use client';

import { motion } from 'framer-motion';
import { ChevronRight, LayoutDashboard, Zap, Phone, BrainCircuit, Workflow, Handshake, Network } from 'lucide-react';
import Link from 'next/link';
import HowItWorks from '@/components/HowItWorks';
import PricingSection from '@/components/PricingSection';
import AppMarketplace from '@/components/AppMarketplace';
import ROICalculator from '@/components/ROICalculator';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100 selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">NWS OS</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
              Client Portal
            </Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-slate-200 transition-colors">
              Deploy OS
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="absolute inset-0 top-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0A0A0A] to-[#0A0A0A] -z-10" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium border border-indigo-500/20 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Software-with-a-Service Command Center
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight"
          >
            Your Entire Business,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Run From One Prompt.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg lg:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Stop wrestling with complex CRM setups and fragmented workflows. 
            NWS OS wraps enterprise-grade power in a beautiful command center, 
            driven by advanced AI and backed by elite human onboarding.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25">
              Get Your Free Business Account <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-white/10"
            >
              See How It Works
            </button>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Core Value Proposition */}
      <section className="py-24 border-y border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">Traditional software gives you tools.<br />We give you outcomes.</h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                Instead of configuring pipelines, writing webhook logic, or building API connections, you simply describe what you need done. Our hybrid engine configures the background systems for you.
              </p>
              
              <div className="space-y-6">
                {[
                  { icon: LayoutDashboard, title: 'Zero CRM Complexity', desc: 'You never have to log into a cluttered backend database again.' },
                  { icon: Network, title: 'The No-Texting Promise', desc: 'We respect regional regulations. No complex A2P SMS registration, no spam. Just high-converting customer handling.' },
                  { icon: Phone, title: 'Inbound AI Receptionist', desc: 'Miss a call? Our intelligent AI assistant picks up immediately, answers questions, handles booking, and logs details.' }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                      <feature.icon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                      <p className="text-slate-400 text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-3xl blur-3xl" />
              <div className="relative rounded-3xl border border-white/10 bg-black/40 p-2 backdrop-blur-xl">
                <div className="rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 aspect-square lg:aspect-[4/3] flex flex-col">
                  {/* Mock UI */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="text-xs text-slate-500 font-medium">NWS Command Center</div>
                  </div>
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="h-12 rounded-xl bg-white/5 flex items-center px-4 border border-white/5">
                      <span className="text-indigo-400 text-sm">You:</span>
                      <span className="text-slate-300 text-sm ml-2">Activate the AI Voice Receptionist for the main line.</span>
                    </div>
                    <div className="h-auto rounded-xl bg-indigo-500/10 p-4 border border-indigo-500/20 self-start max-w-[80%]">
                      <span className="text-purple-400 text-sm font-semibold flex items-center gap-2 mb-2">
                        <BrainCircuit className="w-4 h-4" /> NWS OS
                      </span>
                      <span className="text-slate-300 text-sm leading-relaxed">
                        I&apos;ve initiated the setup. Our onboarding team is configuring the Vapi voice models and GHL routing. It will be live on your dashboard in 24 hours.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* App Marketplace */}
      <AppMarketplace />

      {/* ROI Calculator */}
      <ROICalculator />

      {/* License vs Fuel */}
      <section className="py-24 border-t border-white/5 bg-black/20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">Transparent Pricing:<br />License vs. AI Fuel</h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              We separate the cost of the software from the raw compute power. You only pay for what you actually use—no bloated flat-rate markups.
            </p>
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                <h3 className="text-xl font-semibold mb-2 flex items-center gap-2"><Zap className="w-5 h-5 text-indigo-400" /> Option A: Bring Your Own Keys</h3>
                <p className="text-slate-400 text-sm">Paste your own Anthropic or OpenRouter keys directly into the dashboard. $0 markup. Best for developers.</p>
              </div>
              <div className="p-6 rounded-2xl border border-indigo-500/30 bg-indigo-500/10">
                <h3 className="text-xl font-semibold mb-2 flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-purple-400" /> Option B: NWS Managed Wallet</h3>
                <p className="text-slate-400 text-sm">Load $50 into your wallet. The ledger deducts pennies in real-time as the AI works. Auto-refills at $10. Best for growing SMBs.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4 pt-12">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="text-3xl font-bold text-indigo-400 mb-2">0%</div>
                <div className="text-sm text-slate-400">Markup on BYOK API usage</div>
              </div>
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 backdrop-blur-md">
                <div className="text-3xl font-bold text-white mb-2">100%</div>
                <div className="text-sm text-slate-300">Transparency on wallet ledger</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="text-3xl font-bold text-purple-400 mb-2">Penny</div>
                <div className="text-sm text-slate-400">Pricing per AI voice minute</div>
              </div>
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md aspect-square flex flex-col justify-end">
                <div className="text-sm text-slate-400">Scale without artificial limits.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hybrid Provisioning */}
      <section className="py-24 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl lg:text-4xl font-bold mb-4">Hybrid Provisioning</h2>
        <p className="text-slate-400 text-lg mb-16">We don&apos;t expect you to build your business integrations. NWS OS utilizes a seamless hybrid model to guarantee error-free setups.</p>
        
        <div className="grid sm:grid-cols-4 gap-8">
          {[
            { icon: LayoutDashboard, step: '1', title: 'Request', desc: 'Toggle a feature in your dashboard.' },
            { icon: Workflow, step: '2', title: 'Dispatch', desc: 'System enters Provisioning state.' },
            { icon: Handshake, step: '3', title: 'White-Glove', desc: 'Human experts configure the tech.' },
            { icon: Zap, step: '4', title: 'Go Live', desc: 'Feature instantly lights up.' }
          ].map((s, i) => (
            <div key={i} className="relative flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 z-10 relative">
                <s.icon className="w-6 h-6 text-indigo-400" />
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                  {s.step}
                </div>
              </div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-xs text-slate-400">{s.desc}</p>
              {i < 3 && <div className="hidden sm:block absolute top-8 left-[60%] w-full h-[1px] bg-gradient-to-r from-indigo-500/20 to-transparent" />}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-slate-500 text-sm">
        <p>© 2026 Novelty Web Solutions. All rights reserved.</p>
      </footer>
    </div>
  );
}

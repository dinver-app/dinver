'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Compass, Receipt, Trophy, Gift } from 'lucide-react';
import { Messages } from '@/lib/i18n';

interface HowItWorksProps {
  messages: Messages;
  locale: 'en' | 'hr';
}

export default function HowItWorks({ messages, locale }: HowItWorksProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });

  const steps = [
    {
      icon: Compass,
      title: messages.howItWorks.steps.discover.title,
      description: messages.howItWorks.steps.discover.description,
      color: 'bg-emerald-500',
      iconBg: 'bg-emerald-500/20',
    },
    {
      icon: Receipt,
      title: messages.howItWorks.steps.visit.title,
      description: messages.howItWorks.steps.visit.description,
      color: 'bg-dinver-green',
      iconBg: 'bg-dinver-green/20',
    },
    {
      icon: Trophy,
      title: messages.howItWorks.steps.share.title,
      description: messages.howItWorks.steps.share.description,
      color: 'bg-amber-500',
      iconBg: 'bg-amber-500/20',
    },
  ];

  return (
    <section
      ref={containerRef}
      id="how-it-works"
      className="py-24 lg:py-32 bg-dinver-dark overflow-hidden relative"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-dinver-green/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-dinver-cream/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span className="inline-block px-4 py-2 bg-white/10 text-dinver-cream rounded-full text-sm font-medium mb-6">
            {locale === 'hr' ? '3 Jednostavna koraka' : '3 Simple Steps'}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            {messages.howItWorks.title}
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            {messages.howItWorks.subtitle}
          </p>
        </motion.div>

        {/* Steps - Clean horizontal layout */}
        <div className="relative max-w-4xl mx-auto">
          {/* Steps container */}
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + index * 0.2, duration: 0.5 }}
                className="relative"
              >
                {/* Step card */}
                <div className="flex flex-col items-center text-center">
                  {/* Step number and icon */}
                  <div className="relative mb-6">
                    {/* Glowing background */}
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                      className={`absolute inset-0 ${step.color} rounded-3xl blur-xl opacity-30`}
                    />

                    {/* Main icon container */}
                    <div className={`relative w-20 h-20 ${step.color} rounded-3xl flex items-center justify-center shadow-2xl`}>
                      <step.icon size={36} className="text-white" />
                    </div>

                    {/* Step number badge */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-dinver-cream text-dinver-dark rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                      {index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm max-w-[240px]">
                    {step.description}
                  </p>
                </div>

                {/* Connector line to next step (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(50%+50px)] w-[calc(100%-20px)] h-[2px]">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={isInView ? { scaleX: 1 } : {}}
                      transition={{ duration: 0.5, delay: 0.5 + index * 0.3 }}
                      className={`h-full origin-left ${
                        index === 0
                          ? 'bg-gradient-to-r from-emerald-500 to-dinver-green'
                          : 'bg-gradient-to-r from-dinver-green to-amber-500'
                      }`}
                    />
                  </div>
                )}

                {/* Mobile connector */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center my-6">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={isInView ? { height: 40 } : {}}
                      transition={{ duration: 0.3, delay: 0.5 + index * 0.2 }}
                      className={`w-[2px] ${step.color}`}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 1.2 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10">
            <Gift size={18} className="text-dinver-cream" />
            <p className="text-gray-400 text-sm">
              {locale === 'hr'
                ? 'Top 3 istraživača osvajaju Mystery Box svakih 2 tjedna!'
                : 'Top 3 explorers win a Mystery Box every 2 weeks!'}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

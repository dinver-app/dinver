'use client';

import { motion } from 'framer-motion';
import { Compass, Camera, Share2 } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { Messages } from '@/lib/i18n';

interface HowItWorksProps {
  messages: Messages;
}

export default function HowItWorks({ messages }: HowItWorksProps) {
  const steps = [
    {
      icon: Compass,
      title: messages.howItWorks.steps.discover.title,
      description: messages.howItWorks.steps.discover.description,
      color: 'from-emerald-400 to-dinver-green',
    },
    {
      icon: Camera,
      title: messages.howItWorks.steps.visit.title,
      description: messages.howItWorks.steps.visit.description,
      color: 'from-dinver-green to-teal-500',
    },
    {
      icon: Share2,
      title: messages.howItWorks.steps.share.title,
      description: messages.howItWorks.steps.share.description,
      color: 'from-teal-500 to-cyan-500',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {messages.howItWorks.title}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {messages.howItWorks.subtitle}
          </p>
        </AnimatedSection>

        <div className="relative">
          {/* Connection line - desktop */}
          <div className="hidden lg:block absolute top-24 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-dinver-green/20 via-dinver-green to-dinver-green/20" />

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <AnimatedSection
                key={index}
                delay={index * 0.2}
                className="relative"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex flex-col items-center text-center"
                >
                  {/* Step number */}
                  <div className="relative mb-8">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg shadow-dinver-green/25`}
                    >
                      <step.icon size={36} className="text-white" />
                    </motion.div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                      <span className="text-sm font-bold text-dinver-green">{index + 1}</span>
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed max-w-sm">
                    {step.description}
                  </p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

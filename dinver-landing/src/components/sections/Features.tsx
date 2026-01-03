'use client';

import { motion } from 'framer-motion';
import { Users, Sparkles, Trophy, Bookmark, Search, Info } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { Messages } from '@/lib/i18n';

interface FeaturesProps {
  messages: Messages;
}

export default function Features({ messages }: FeaturesProps) {
  const features = [
    {
      icon: Users,
      title: messages.features.items.community.title,
      description: messages.features.items.community.description,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: Sparkles,
      title: messages.features.items.experiences.title,
      description: messages.features.items.experiences.description,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: Trophy,
      title: messages.features.items.rewards.title,
      description: messages.features.items.rewards.description,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      icon: Bookmark,
      title: messages.features.items.lists.title,
      description: messages.features.items.lists.description,
      color: 'bg-rose-50 text-rose-600',
    },
    {
      icon: Search,
      title: messages.features.items.search.title,
      description: messages.features.items.search.description,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: Info,
      title: messages.features.items.details.title,
      description: messages.features.items.details.description,
      color: 'bg-cyan-50 text-cyan-600',
    },
  ];

  return (
    <section id="features" className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {messages.features.title}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {messages.features.subtitle}
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <AnimatedSection
              key={index}
              delay={index * 0.1}
              className="group"
            >
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
                className="h-full p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:border-dinver-green/20 hover:shadow-xl hover:shadow-dinver-green/5 transition-all duration-300"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

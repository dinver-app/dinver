'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Heart, Users, Target } from 'lucide-react';
import { Messages } from '@/lib/i18n';

interface OurStoryProps {
  messages: Messages;
  locale?: string;
}

export default function OurStory({ messages, locale = 'hr' }: OurStoryProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const values = [
    {
      icon: Heart,
      title: messages.about.values.authenticity.title,
      description: messages.about.values.authenticity.description,
    },
    {
      icon: Users,
      title: messages.about.values.community.title,
      description: messages.about.values.community.description,
    },
    {
      icon: Target,
      title: messages.about.values.quality.title,
      description: messages.about.values.quality.description,
    },
  ];

  return (
    <section ref={ref} className="py-16 sm:py-20 lg:py-24 bg-linear-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Our Story */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto mb-16 sm:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 text-center">
            {messages.about.story.title}
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed text-center">
            {messages.about.story.paragraphs[0]}
          </p>
        </motion.div>

        {/* Our Mission */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12 sm:mb-16"
        >
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            {messages.about.mission.subtitle}
          </p>
        </motion.div>

        {/* Values */}
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 bg-dinver-green/10 rounded-xl flex items-center justify-center mb-4">
                <value.icon className="text-dinver-green" size={28} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {value.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Sparkles,
  Trophy,
  Bookmark,
  Search,
  View,
} from 'lucide-react';
import { Messages } from '@/lib/i18n';

interface FeaturesBentoProps {
  messages: Messages;
  locale: 'en' | 'hr';
}

export default function FeaturesBento({ messages, locale }: FeaturesBentoProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Infinite scroll loop
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const cardWidth = 320 + 24; // card width + gap
    const totalWidth = cardWidth * 6; // 6 original cards

    const handleScroll = () => {
      // When scrolled to the cloned end, jump to start
      if (container.scrollLeft >= totalWidth) {
        container.scrollLeft = container.scrollLeft - totalWidth;
      }
      // When scrolled before start, jump to end
      if (container.scrollLeft <= 0) {
        container.scrollLeft = container.scrollLeft + totalWidth;
      }
    };

    container.addEventListener('scroll', handleScroll);

    // Start in the middle (at first set of cards)
    container.scrollLeft = cardWidth;

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth drag to scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;
    let velX = 0;
    let momentumID: number;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX;
      scrollLeft = container.scrollLeft;
      cancelAnimationFrame(momentumID);
    };

    const handleMouseLeave = () => {
      if (isDown) {
        isDown = false;
        beginMomentum();
      }
    };

    const handleMouseUp = () => {
      if (isDown) {
        isDown = false;
        beginMomentum();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX;
      const walk = (startX - x) * 1.2;
      velX = startX - x;
      startX = x;
      container.scrollLeft = scrollLeft + walk;
      scrollLeft = container.scrollLeft;
    };

    const beginMomentum = () => {
      const friction = 0.95;
      const momentum = () => {
        velX *= friction;
        container.scrollLeft += velX * 0.5;
        if (Math.abs(velX) > 0.5) {
          momentumID = requestAnimationFrame(momentum);
        }
      };
      momentum();
    };

    // Touch events for mobile
    const handleTouchStart = (e: TouchEvent) => {
      isDown = true;
      startX = e.touches[0].pageX;
      scrollLeft = container.scrollLeft;
      cancelAnimationFrame(momentumID);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDown) return;
      const x = e.touches[0].pageX;
      const walk = (startX - x) * 1.2;
      velX = startX - x;
      startX = x;
      container.scrollLeft = scrollLeft + walk;
      scrollLeft = container.scrollLeft;
    };

    const handleTouchEnd = () => {
      if (isDown) {
        isDown = false;
        beginMomentum();
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(momentumID);
    };
  }, []);

  const features = [
    {
      icon: Sparkles,
      title: messages.features.items.experiences.title,
      description: messages.features.items.experiences.description,
      gradient: 'from-purple-100 to-pink-100',
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-200',
      badge: locale === 'hr' ? 'Jedinstveno na tržištu' : 'Unique feature',
      badgeColor: 'bg-purple-600',
    },
    {
      icon: Trophy,
      title: messages.features.items.rewards.title,
      description: messages.features.items.rewards.description,
      gradient: 'from-amber-100 to-orange-100',
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-200',
      badge: locale === 'hr' ? 'Mystery Box' : 'Mystery Box',
      badgeColor: 'bg-amber-600',
    },
    {
      icon: Users,
      title: messages.features.items.community.title,
      description: messages.features.items.community.description,
      gradient: 'from-blue-100 to-cyan-100',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-200',
    },
    {
      icon: Bookmark,
      title: messages.features.items.lists.title,
      description: messages.features.items.lists.description,
      gradient: 'from-rose-100 to-pink-100',
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-200',
    },
    {
      icon: Search,
      title: messages.features.items.search.title,
      description: messages.features.items.search.description,
      gradient: 'from-emerald-100 to-teal-100',
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-200',
    },
    {
      icon: View,
      title: messages.features.items.details.title,
      description: messages.features.items.details.description,
      gradient: 'from-cyan-100 to-sky-100',
      iconColor: 'text-cyan-600',
      iconBg: 'bg-cyan-200',
    },
  ];

  return (
    <section id="features" className="py-24 lg:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-2 bg-dinver-green/10 text-dinver-green rounded-full text-sm font-semibold mb-6"
          >
            {locale === 'hr' ? 'Mogućnosti' : 'Features'}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {messages.features.title}
          </h2>
          <p className="mt-4 text-lg text-gray-600">{messages.features.subtitle}</p>
        </motion.div>
      </div>

      {/* Horizontal scrolling cards */}
      <div className="relative">
        {/* Gradient fades on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-8 lg:px-16 pb-4 cursor-grab active:cursor-grabbing select-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {/* Triple the cards for infinite loop effect */}
          {[...features, ...features, ...features].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (index % 6) * 0.05 }}
              className="flex-shrink-0 w-[320px]"
            >
              <div
                className={`relative bg-gradient-to-br ${feature.gradient} rounded-3xl p-6 h-full min-h-[280px] shadow-sm hover:shadow-lg transition-shadow duration-300`}
              >
                {/* Badge */}
                {feature.badge && (
                  <span
                    className={`absolute top-4 right-4 ${feature.badgeColor} text-white text-xs font-semibold px-3 py-1 rounded-full`}
                  >
                    {feature.badge}
                  </span>
                )}

                {/* Icon */}
                <div
                  className={`w-14 h-14 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-5`}
                >
                  <feature.icon className={feature.iconColor} size={28} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 pointer-events-none">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm pointer-events-none">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

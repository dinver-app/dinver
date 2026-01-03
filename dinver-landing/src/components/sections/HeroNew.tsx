'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPin, Star, Users, ArrowDown } from 'lucide-react';
import CountUp from 'react-countup';
import Image from 'next/image';
import AppStoreButtons from '@/components/ui/AppStoreButtons';
import { Messages } from '@/lib/i18n';
import { getLandingStats, LandingStatsResponse } from '@/lib/api';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface HeroNewProps {
  messages: Messages;
}

export default function HeroNew({ messages }: HeroNewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<LandingStatsResponse['stats'] | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Parallax scroll effect
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  // Fetch real stats
  useEffect(() => {
    getLandingStats()
      .then((data) => setStats(data.stats))
      .catch(() => {
        setStats({
          experiences: 25000,
          partners: 150,
          users: 10000,
          activeUpdates: 50,
        });
      });
  }, []);

  // Trigger visibility for CountUp
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Phone screenshots for showcase
  const phones = [
    { src: '/screenshots/experience-feed.PNG', alt: 'Experience Feed', rotate: -12, z: 1 },
    { src: '/screenshots/whats-new.PNG', alt: "What's New", rotate: 0, z: 3 },
    { src: '/screenshots/leaderboard.PNG', alt: 'Leaderboard', rotate: 12, z: 2 },
  ];

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-dinver-dark"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-dinver-green/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-dinver-cream/10 rounded-full blur-[100px] animate-pulse animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-dinver-green/5 rounded-full blur-[150px]" />
      </div>

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-noise" />

      <motion.div style={{ y, opacity, scale }} className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          {/* Center content */}
          <div className="text-center max-w-4xl mx-auto">
            {/* Animated tagline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-8 border border-white/10"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dinver-cream opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-dinver-cream"></span>
              </span>
              <span className="text-dinver-cream text-sm font-medium">
                {messages.hero.tagline}
              </span>
            </motion.div>

            {/* Main title with gradient */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6"
            >
              <span className="block">{messages.hero.title.split(' ').slice(0, 3).join(' ')}</span>
              <span className="text-gradient-light">{messages.hero.title.split(' ').slice(3).join(' ')}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto mb-10"
            >
              {messages.hero.subtitle}
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center mb-16"
            >
              <AppStoreButtons variant="light" />
            </motion.div>
          </div>

          {/* Phone showcase - 3 phones in a fan layout */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="relative flex justify-center items-end h-[400px] sm:h-[500px] lg:h-[550px]"
          >
            {phones.map((phone, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 100, rotate: phone.rotate }}
                animate={{ opacity: 1, y: 0, rotate: phone.rotate }}
                transition={{ delay: 0.8 + index * 0.15, duration: 0.6, type: 'spring' }}
                whileHover={{ y: -20, scale: 1.05, zIndex: 10 }}
                style={{ zIndex: phone.z }}
                className={`absolute ${
                  index === 0 ? '-left-4 sm:left-[15%] lg:left-[20%]' :
                  index === 1 ? 'left-1/2 -translate-x-1/2' :
                  '-right-4 sm:right-[15%] lg:right-[20%]'
                } bottom-0 cursor-pointer transition-all duration-300`}
              >
                <div className={`relative ${
                  index === 1
                    ? 'w-[180px] sm:w-[220px] lg:w-[260px] h-[360px] sm:h-[440px] lg:h-[520px]'
                    : 'w-[140px] sm:w-[180px] lg:w-[220px] h-[280px] sm:h-[360px] lg:h-[440px]'
                } bg-gray-900 rounded-[2rem] sm:rounded-[2.5rem] p-1.5 sm:p-2 shadow-2xl`}>
                  <div className="w-full h-full bg-white rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden relative">
                    <Image
                      src={phone.src}
                      alt={phone.alt}
                      fill
                      className="object-cover object-top"
                      priority={index === 1}
                    />
                  </div>
                  {/* Glowing border effect */}
                  <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-t from-dinver-green/20 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              </motion.div>
            ))}

            {/* Glow behind phones */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-dinver-green/20 rounded-full blur-[80px] -z-10" />
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="flex justify-center gap-8 sm:gap-16 mt-12 pt-8 border-t border-white/10"
          >
            {[
              { value: stats?.partners || 150, suffix: '+', label: messages.hero.stats.restaurants, icon: MapPin },
              { value: stats?.users ? Math.floor(stats.users / 1000) : 10, suffix: 'K+', label: messages.hero.stats.users, icon: Users },
              { value: stats?.experiences ? Math.floor(stats.experiences / 1000) : 25, suffix: 'K+', label: messages.hero.stats.experiences, icon: Star },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <stat.icon size={16} className="text-dinver-cream" />
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {isVisible && (
                      <CountUp start={0} end={stat.value} duration={2} delay={0.3 + index * 0.2} suffix={stat.suffix} />
                    )}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.button
          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-gray-500 hover:text-dinver-cream transition-colors cursor-pointer"
        >
          <span className="text-xs font-medium uppercase tracking-wider">Scroll</span>
          <ArrowDown size={20} />
        </motion.button>
      </motion.div>
    </section>
  );
}

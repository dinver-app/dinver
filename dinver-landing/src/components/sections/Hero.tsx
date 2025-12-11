'use client';

import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Star, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Messages } from '@/lib/i18n';

interface HeroProps {
  messages: Messages;
}

export default function Hero({ messages }: HeroProps) {
  const stats = [
    { value: '150+', label: messages.hero.stats.restaurants, icon: MapPin },
    { value: '10K+', label: messages.hero.stats.users, icon: Users },
    { value: '25K+', label: messages.hero.stats.experiences, icon: Star },
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-dinver-green/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-dinver-green/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-2 bg-dinver-green/10 text-dinver-green rounded-full text-sm font-semibold mb-6"
            >
              {messages.hero.tagline}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
            >
              {messages.hero.title.split(' ').map((word, i) => (
                <span
                  key={i}
                  className={word.toLowerCase() === 'great' || word.toLowerCase() === 'odličan' ? 'text-dinver-green' : ''}
                >
                  {word}{' '}
                </span>
              ))}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl"
            >
              {messages.hero.subtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {messages.hero.cta}
                <ArrowRight size={20} className="ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {messages.hero.ctaSecondary}
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-12 grid grid-cols-3 gap-6"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <stat.icon size={18} className="text-dinver-green" />
                    <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                  </div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative">
              {/* Main phone */}
              <div className="relative z-10 w-64 sm:w-72 h-[520px] sm:h-[580px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
                <div className="w-full h-full bg-gray-100 rounded-[2.5rem] overflow-hidden relative">
                  {/* Phone screen placeholder - replace with actual app screenshot */}
                  <div className="absolute inset-0 bg-gradient-to-br from-dinver-green/20 to-emerald-50 flex items-center justify-center">
                    <div className="text-center p-6">
                      <div className="w-20 h-20 bg-dinver-green rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 40 40"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M14 10V30M14 10C14 10 18 12 18 16C18 20 14 20 14 20"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M26 10V14M26 14V18M26 18C28 18 28 14 28 14M26 18V30M24 10V14M24 14C22 14 22 18 24 18M24 14V10M28 10V14"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">App Screenshot</p>
                      <p className="text-gray-400 text-xs mt-1">Place your image here</p>
                    </div>
                  </div>
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl" />
                </div>
              </div>

              {/* Floating cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-16 top-20 bg-white rounded-2xl shadow-xl p-4 z-20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dinver-green/10 rounded-full flex items-center justify-center">
                    <Star className="text-dinver-green" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">New Experience</p>
                    <p className="font-semibold text-sm">+50 points</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -right-8 bottom-32 bg-white rounded-2xl shadow-xl p-4 z-20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <MapPin className="text-dinver-green" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Visit verified!</p>
                    <p className="font-semibold text-sm">La Pergola</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center pt-2"
        >
          <div className="w-1.5 h-3 bg-dinver-green rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}

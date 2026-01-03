'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Autoplay } from 'swiper/modules';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { Messages } from '@/lib/i18n';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-cards';

interface ExperienceFeedNewProps {
  messages: Messages;
  locale: 'en' | 'hr';
}

type TabType = 'experiences' | 'whatsNew';

export default function ExperienceFeedNew({ messages, locale }: ExperienceFeedNewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('experiences');

  return (
    <section className="py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <AnimatedSection direction="left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-dinver-green/10 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-dinver-green" />
              <span className="text-dinver-green text-sm font-semibold">
                {locale === 'hr' ? 'Jedinstveno na tržištu' : 'Unique in the market'}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              {messages.experienceFeed.title}
            </h2>
            <p className="mt-2 text-dinver-green font-medium text-lg">
              {messages.experienceFeed.subtitle}
            </p>
            <p className="mt-6 text-gray-600 text-lg leading-relaxed">
              {messages.experienceFeed.description}
            </p>

            {/* Tabs */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setActiveTab('experiences')}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'experiences'
                    ? 'bg-dinver-green text-white shadow-lg shadow-dinver-green/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {locale === 'hr' ? 'Doživljaji' : 'Experiences'}
              </button>
              <button
                onClick={() => setActiveTab('whatsNew')}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'whatsNew'
                    ? 'bg-dinver-green text-white shadow-lg shadow-dinver-green/25'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {locale === 'hr' ? 'Što je novo' : "What's New"}
              </button>
            </div>

            {/* Tab description */}
            <motion.p
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-gray-500 text-sm"
            >
              {activeTab === 'experiences'
                ? locale === 'hr'
                  ? 'Pregledaj prave gastro doživljaje od naših korisnika'
                  : 'Browse real dining experiences from our users'
                : locale === 'hr'
                ? 'Prati što je novo u tvojim omiljenim restoranima'
                : 'Follow updates from your favorite restaurants'}
            </motion.p>
          </AnimatedSection>

          {/* Phone with Real Screenshots */}
          <AnimatedSection direction="right" className="relative">
            <div className="relative flex justify-center">
              {/* Phone frame */}
              <div className="relative w-[280px] sm:w-[300px] h-[580px] sm:h-[620px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                  {/* Screenshot content with smooth transition */}
                  <AnimatePresence mode="wait">
                    {activeTab === 'experiences' ? (
                      <motion.div
                        key="experiences"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="h-full"
                      >
                        <Swiper
                          effect="cards"
                          grabCursor={true}
                          modules={[EffectCards, Autoplay]}
                          autoplay={{ delay: 5000, disableOnInteraction: true }}
                          className="h-full w-full"
                        >
                          <SwiperSlide className="rounded-[2.5rem] overflow-hidden">
                            <Image
                              src="/screenshots/experience-feed.PNG"
                              alt="Experience Feed"
                              fill
                              className="object-cover object-top"
                            />
                          </SwiperSlide>
                          <SwiperSlide className="rounded-[2.5rem] overflow-hidden">
                            <Image
                              src="/screenshots/experience-feed-2.PNG"
                              alt="Experience Feed - Ambience"
                              fill
                              className="object-cover object-top"
                            />
                          </SwiperSlide>
                        </Swiper>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="whatsNew"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="h-full relative"
                      >
                        <Image
                          src="/screenshots/whats-new.PNG"
                          alt="What's New Feed"
                          fill
                          className="object-cover object-top"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Glow effect */}
              <div className="absolute inset-0 bg-dinver-green/10 rounded-[3rem] blur-3xl -z-10" />
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

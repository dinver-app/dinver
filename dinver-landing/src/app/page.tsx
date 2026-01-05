'use client';

import { useState, useEffect } from 'react';
import { Locale, getMessages, defaultLocale } from '@/lib/i18n';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// New redesigned sections
import HeroNew from '@/components/sections/HeroNew';
import FeaturesBento from '@/components/sections/FeaturesBento';
import ExperienceFeedNew from '@/components/sections/ExperienceFeedNew';
import RewardsSection from '@/components/sections/RewardsSection';
import PartnersSection from '@/components/sections/PartnersSection';
import SocialProof from '@/components/sections/SocialProof';
import FAQ from '@/components/sections/FAQ';

// Keep original sections that work well
import HowItWorks from '@/components/sections/HowItWorks';
import Contact from '@/components/sections/Contact';

export default function Home() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(getMessages(defaultLocale));

  useEffect(() => {
    // Check for saved locale preference
    const savedLocale = localStorage.getItem('dinver-locale') as Locale | null;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'hr')) {
      setLocale(savedLocale);
      setMessages(getMessages(savedLocale));
    }
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(getMessages(newLocale));
    localStorage.setItem('dinver-locale', newLocale);
  };

  return (
    <main className="min-h-screen bg-white">
      <Header messages={messages} locale={locale} onLocaleChange={handleLocaleChange} />

      {/* New Hero with CountUp stats and GSAP animations */}
      <HeroNew messages={messages} />

      {/* Bento grid features */}
      <FeaturesBento messages={messages} locale={locale} />

      {/* How it works - modernized */}
      <HowItWorks messages={messages} locale={locale} />

      {/* Interactive Experience Feed Demo with Swiper */}
      <ExperienceFeedNew messages={messages} locale={locale} />

      {/* Rewards & Gamification section */}
      <RewardsSection messages={messages} locale={locale} />

      {/* Partner Restaurants section */}
      <PartnersSection messages={messages} locale={locale} />

      {/* Social Proof with partners marquee, stats, and experiences */}
      <SocialProof locale={locale} />

      {/* FAQ Section */}
      <FAQ messages={messages} />

      {/* Contact form - kept from original */}
      <Contact messages={messages} />

      <Footer messages={messages} />
    </main>
  );
}

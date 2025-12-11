'use client';

import { useState, useEffect } from 'react';
import { Locale, getMessages, defaultLocale } from '@/lib/i18n';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import Features from '@/components/sections/Features';
import HowItWorks from '@/components/sections/HowItWorks';
import ExperienceFeed from '@/components/sections/ExperienceFeed';
import ForRestaurants from '@/components/sections/ForRestaurants';
import RestaurantMap from '@/components/sections/RestaurantMap';
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
      <Hero messages={messages} />
      <Features messages={messages} />
      <HowItWorks messages={messages} />
      <ExperienceFeed messages={messages} />
      <ForRestaurants messages={messages} />
      <RestaurantMap messages={messages} />
      <Contact messages={messages} />
      <Footer messages={messages} />
    </main>
  );
}

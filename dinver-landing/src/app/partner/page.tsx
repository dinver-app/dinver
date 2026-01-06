'use client';

import { useState, useEffect } from 'react';
import { Locale, getMessages, defaultLocale } from '@/lib/i18n';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Pricing from '@/components/sections/Pricing';
import Contact from '@/components/sections/Contact';

export default function PartnerPage() {
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

      {/* Pricing section first */}
      <div className="pt-20">
        <Pricing messages={messages} locale={locale} />
      </div>

      {/* Contact form */}
      <Contact messages={messages} locale={locale} />

      <Footer messages={messages} locale={locale} />
    </main>
  );
}

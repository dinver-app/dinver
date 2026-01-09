'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Locale, getMessages, defaultLocale } from '@/lib/i18n';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function UvjetiKoristenja() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(getMessages(defaultLocale));

  useEffect(() => {
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

      <div className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-dinver-green hover:text-dinver-green-dark mb-8 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            {messages.termsOfService.backToHome}
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
            {messages.termsOfService.title}
          </h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              {messages.termsOfService.lastUpdated}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.acceptance.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.acceptance.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.serviceDescription.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.serviceDescription.intro}
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                {messages.termsOfService.serviceDescription.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.userAccount.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.userAccount.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.userContent.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.userContent.intro}
              </p>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.userContent.prohibited}
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                {messages.termsOfService.userContent.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.userContent.removal}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.rewardSystem.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.rewardSystem.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.limitationOfLiability.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.limitationOfLiability.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.termsChanges.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.termsChanges.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.contact.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.contact.intro}
              </p>
              <p className="text-gray-600">
                <strong>{messages.termsOfService.contact.email}</strong> info@dinver.eu
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.accountTermination.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.accountTermination.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.restaurantDisclaimer.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.restaurantDisclaimer.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.receiptVerification.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.receiptVerification.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.intellectualProperty.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.intellectualProperty.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.indemnification.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.indemnification.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.disputeResolution.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.disputeResolution.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.forceMajeure.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.forceMajeure.content}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{messages.termsOfService.severability.title}</h2>
              <p className="text-gray-600 mb-4">
                {messages.termsOfService.severability.content}
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer messages={messages} locale={locale} />
    </main>
  );
}

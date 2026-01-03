'use client';

import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQProps {
  locale: 'en' | 'hr';
}

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ({ locale }: FAQProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = locale === 'hr' ? [
    {
      question: 'Što je Dinver?',
      answer: 'Dinver je aplikacija koja kombinira društvenu mrežu s vodičem za restorane. Omogućuje vam otkrivanje novih restorana kroz autentična iskustva drugih korisnika, praćenje prijatelja i zarađivanje nagrada za svaki posjet.',
    },
    {
      question: 'Je li Dinver besplatan?',
      answer: 'Da! Dinver je potpuno besplatan za korisnike. Preuzmite aplikaciju, kreirajte profil i počnite istraživati gastro scenu bez ikakvih troškova.',
    },
    {
      question: 'Kako zarađujem bodove i nagrade?',
      answer: 'Bodove zarađujete na više načina: skeniranjem računa nakon posjeta restoranu, objavljivanjem doživljaja sa slikama i održavanjem niza posjeta. Svaka 2 tjedna Top 1 korisnik i jedan nasumično odabrani korisnik osvajaju Mystery Box s nagradama!',
    },
    {
      question: 'Kako mogu postati partner restoran?',
      answer: 'Jednostavno! Kontaktirajte nas putem forme na našoj stranici ili direktno na info@dinver.eu. Naš tim će vam pomoći s postavljanjem profila, virtualnom šetnjom i svim alatima koje nudimo partnerima.',
    },
    {
      question: 'Što partner restorani dobivaju?',
      answer: 'Partner restorani dobivaju istaknuto pozicioniranje, 360° virtualnu šetnju, interaktivni meni, mogućnost objave What\'s New novosti, detaljnu analitiku o posjetima i pristup angažiranoj zajednici ljubitelja hrane.',
    },
    {
      question: 'Je li Dinver dostupan u mom gradu?',
      answer: 'Trenutno smo fokusirani na Hrvatsku, s naglaskom na veće gradove. Stalno širimo pokrivenost, pa ako nema puno restorana u vašem gradu, možete pomoći dodavanjem novih mjesta!',
    },
  ] : [
    {
      question: 'What is Dinver?',
      answer: 'Dinver is an app that combines a social network with a restaurant guide. It allows you to discover new restaurants through authentic experiences from other users, follow friends, and earn rewards for every visit.',
    },
    {
      question: 'Is Dinver free?',
      answer: 'Yes! Dinver is completely free for users. Download the app, create a profile, and start exploring the food scene at no cost.',
    },
    {
      question: 'How do I earn points and rewards?',
      answer: 'You earn points in several ways: scanning receipts after visiting a restaurant, posting experiences with photos, and maintaining visit streaks. Every 2 weeks, the Top 1 user and one randomly selected user win a Mystery Box with prizes!',
    },
    {
      question: 'How can my restaurant become a partner?',
      answer: 'Easy! Contact us through the form on our website or directly at info@dinver.eu. Our team will help you set up your profile, virtual tour, and all the tools we offer to partners.',
    },
    {
      question: 'What do partner restaurants get?',
      answer: 'Partner restaurants get featured positioning, 360° virtual tours, interactive menus, ability to post What\'s New updates, detailed analytics on visits, and access to an engaged community of food lovers.',
    },
    {
      question: 'Is Dinver available in my city?',
      answer: 'We are currently focused on Croatia, with emphasis on larger cities. We are constantly expanding coverage, so if there aren\'t many restaurants in your city, you can help by adding new places!',
    },
  ];

  return (
    <section ref={containerRef} id="faq" className="py-24 lg:py-32 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-dinver-green/10 text-dinver-green rounded-full text-sm font-semibold mb-6">
            <HelpCircle size={16} />
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            {locale === 'hr' ? 'Česta pitanja' : 'Frequently Asked Questions'}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {locale === 'hr'
              ? 'Sve što trebate znati o Dinveru'
              : 'Everything you need to know about Dinver'}
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 * index }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full bg-white rounded-xl p-5 text-left shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="text-gray-500" size={20} />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="mt-4 text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600">
            {locale === 'hr'
              ? 'Imate još pitanja? '
              : 'Have more questions? '}
            <a
              href="mailto:info@dinver.eu"
              className="text-dinver-green hover:text-dinver-green-dark font-medium"
            >
              {locale === 'hr' ? 'Kontaktirajte nas' : 'Contact us'}
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

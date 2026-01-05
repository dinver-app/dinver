"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Utensils,
  Users,
  MapPin,
  Heart,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { Locale, getMessages, defaultLocale } from "@/lib/i18n";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ONama() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(getMessages(defaultLocale));

  useEffect(() => {
    const savedLocale = localStorage.getItem("dinver-locale") as Locale | null;
    if (savedLocale && (savedLocale === "en" || savedLocale === "hr")) {
      setLocale(savedLocale);
      setMessages(getMessages(savedLocale));
    }
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(getMessages(newLocale));
    localStorage.setItem("dinver-locale", newLocale);
  };

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
    <main className="min-h-screen bg-white">
      <Header
        messages={messages}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />

      {/* Hero */}
      <section className="pt-24 pb-16 bg-linear-to-b from-dinver-dark to-dinver-green-dark text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{messages.about.hero.title}</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              {messages.about.hero.subtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {messages.about.story.title}
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
              {messages.about.story.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {messages.about.mission.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {messages.about.mission.subtitle}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm"
              >
                <div className="w-12 h-12 bg-dinver-green/10 rounded-xl flex items-center justify-center mb-4">
                  <value.icon className="text-dinver-green" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What we offer */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {messages.about.offerings.title}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-dinver-dark text-white rounded-2xl p-8"
            >
              <Utensils className="text-dinver-cream mb-4" size={32} />
              <h3 className="text-xl font-bold mb-3">{messages.about.offerings.forUsers.title}</h3>
              <ul className="space-y-2 text-gray-300">
                {messages.about.offerings.forUsers.items.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gray-100 rounded-2xl p-8"
            >
              <MapPin className="text-dinver-green mb-4" size={32} />
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {messages.about.offerings.forRestaurants.title}
              </h3>
              <ul className="space-y-2 text-gray-600">
                {messages.about.offerings.forRestaurants.items.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-dinver-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-dinver-dark mb-4">
              {messages.about.cta.title}
            </h2>
            <p className="text-dinver-dark/70 mb-6">
              {messages.about.cta.subtitle}
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center bg-dinver-dark text-white px-6 py-3 rounded-lg font-medium hover:bg-dinver-green-dark transition-colors"
            >
              {messages.about.cta.button}
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer messages={messages} />
    </main>
  );
}

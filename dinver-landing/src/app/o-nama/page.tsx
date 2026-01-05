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
      title: "Autentičnost",
      description:
        "Vjerujemo u prava iskustva od pravih ljudi. Bez lažnih recenzija, samo iskrene preporuke.",
    },
    {
      icon: Users,
      title: "Zajednica",
      description:
        "Gradimo zajednicu ljubitelja hrane koji dijele strast prema otkrivanju novih gastro doživljaja.",
    },
    {
      icon: Target,
      title: "Kvaliteta",
      description:
        "Surađujemo samo s restoranima koji dijele našu strast prema kvaliteti i izvrsnosti.",
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
          <Link
            href="/"
            className="inline-flex items-center text-dinver-cream hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Natrag na početnu
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">O nama</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Dinver je platforma koja povezuje ljubitelje hrane s najboljim
              gastronomskim iskustvima u Hrvatskoj.
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
              Naša priča
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
              <p>
                Dinver je nastao iz jednostavne ideje: olakšati ljudima
                pronalazak njihovog sljedećeg omiljenog restorana. U svijetu
                prepunom generickih recenzija i plaćenih preporuka, željeli smo
                stvoriti mjesto gdje prava iskustva dolaze od pravih ljudi.
              </p>
              <p>
                Naša platforma kombinira društvenu mrežu s vodičem za restorane,
                omogućujući korisnicima da prate prijatelje, dijele svoje gastro
                trenutke i otkrivaju skrivene dragulje koje ne biste pronašli
                drugdje.
              </p>
              <p>
                Danas Dinver okuplja zajednicu strastvenih ljubitelja hrane koji
                aktivno istražuju, dijele i nagrađuju se za svaki novi gastro
                doživljaj.
              </p>
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
              Naša misija
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Povezati svakog ljubitelja hrane s autentičnim gastronomskim
              iskustvima i pomoći restoranima da dopru do pravih gostiju.
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
              Što nudimo
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
              <h3 className="text-xl font-bold mb-3">Za korisnike</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Otkrijte nove restorane kroz autentične recenzije</li>
                <li>• Pratite prijatelje i vidite gdje su večerali</li>
                <li>• Zarađujte bodove i nagrade za svaki posjet</li>
                <li>• Pretražujte po jelu, ne samo po restoranu</li>
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
                Za restorane
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Povećajte vidljivost među pravim ljubiteljima hrane</li>
                <li>• Predstavite svoj prostor s 360° virtualnom šetnjom</li>
                <li>
                  • Dijelite novosti i događaje putem &quot;What&apos;s
                  New&quot;
                </li>
                <li>• Pratite analitiku i razumijte svoje goste</li>
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
              Želite surađivati s nama?
            </h2>
            <p className="text-dinver-dark/70 mb-6">
              Bilo da ste restoran koji želi postati partner ili imate bilo
              kakvo pitanje, rado ćemo čuti od vas.
            </p>
            <Link
              href="/kontakt"
              className="inline-flex items-center bg-dinver-dark text-white px-6 py-3 rounded-lg font-medium hover:bg-dinver-green-dark transition-colors"
            >
              Kontaktirajte nas
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer messages={messages} />
    </main>
  );
}

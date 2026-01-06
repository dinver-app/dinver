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
            Natrag na početnu
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
            Uvjeti korištenja
          </h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              Zadnje ažuriranje: Siječanj 2025.
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Prihvaćanje uvjeta</h2>
              <p className="text-gray-600 mb-4">
                Korištenjem Dinver aplikacije i web stranice pristajete na ove Uvjete korištenja.
                Ako se ne slažete s bilo kojim dijelom ovih uvjeta, molimo vas da ne koristite naše usluge.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Opis usluge</h2>
              <p className="text-gray-600 mb-4">
                Dinver je platforma koja povezuje ljubitelje hrane s restoranima. Korisnicima omogućujemo:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Otkrivanje novih restorana i gastronomskih iskustava</li>
                <li>Dijeljenje svojih doživljaja s hranom i restoranima</li>
                <li>Praćenje posjeta restoranima i zarađivanje bodova</li>
                <li>Pristup informacijama o restoranima, menijima i radnom vremenu</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Korisnički račun</h2>
              <p className="text-gray-600 mb-4">
                Za korištenje određenih funkcionalnosti potrebno je kreirati korisnički račun.
                Vi ste odgovorni za čuvanje povjerljivosti svojih pristupnih podataka i za sve
                aktivnosti koje se odvijaju pod vašim računom.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Korisnički sadržaj</h2>
              <p className="text-gray-600 mb-4">
                Objavljujući sadržaj na Dinveru (fotografije, recenzije, komentare), zadržavate
                vlasništvo nad tim sadržajem, ali nam dajete neekskluzivnu, besplatnu licencu za
                korištenje, prikazivanje i distribuciju tog sadržaja na platformi.
              </p>
              <p className="text-gray-600 mb-4">
                Zabranjeno je objavljivanje sadržaja koji je:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Uvredljiv, prijeteći ili diskriminirajući</li>
                <li>Lažan ili obmanjujući</li>
                <li>Krši autorska prava ili prava intelektualnog vlasništva</li>
                <li>Sadrži nezakonit sadržaj</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Sustav nagrada</h2>
              <p className="text-gray-600 mb-4">
                Dinver nudi sustav bodova i nagrada za aktivne korisnike. Zadržavamo pravo
                izmjene pravila sustava nagrada u bilo kojem trenutku. Bodovi nemaju novčanu
                vrijednost i ne mogu se zamijeniti za novac.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Ograničenje odgovornosti</h2>
              <p className="text-gray-600 mb-4">
                Dinver pruža informacije o restoranima na temelju javno dostupnih podataka i
                korisničkih doprinosa. Ne garantiramo točnost, potpunost ili ažurnost tih
                informacija. Nismo odgovorni za kvalitetu usluge u restoranima.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Izmjene uvjeta</h2>
              <p className="text-gray-600 mb-4">
                Zadržavamo pravo izmjene ovih Uvjeta korištenja u bilo kojem trenutku.
                O značajnim izmjenama ćemo vas obavijestiti putem aplikacije ili e-maila.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Kontakt</h2>
              <p className="text-gray-600 mb-4">
                Za sva pitanja u vezi s ovim Uvjetima korištenja, kontaktirajte nas na:
              </p>
              <p className="text-gray-600">
                <strong>Email:</strong> info@dinver.eu
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer messages={messages} locale={locale} />
    </main>
  );
}

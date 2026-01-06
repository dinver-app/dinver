'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Locale, getMessages, defaultLocale } from '@/lib/i18n';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function PolitikaPrivatnosti() {
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
            Politika privatnosti
          </h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              Zadnje ažuriranje: Siječanj 2025.
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Uvod</h2>
              <p className="text-gray-600 mb-4">
                Dinver (&quot;mi&quot;, &quot;nas&quot; ili &quot;naš&quot;) posvećen je zaštiti vaše privatnosti.
                Ova Politika privatnosti objašnjava kako prikupljamo, koristimo i štitimo
                vaše osobne podatke kada koristite našu aplikaciju i web stranicu.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Podaci koje prikupljamo</h2>
              <p className="text-gray-600 mb-4">
                Prikupljamo sljedeće vrste podataka:
              </p>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Podaci koje vi pružate:</h3>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Ime i prezime</li>
                <li>Email adresa</li>
                <li>Profilna fotografija</li>
                <li>Sadržaj koji objavljujete (fotografije, recenzije, komentari)</li>
                <li>Podaci o posjećenim restoranima</li>
              </ul>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Podaci koje automatski prikupljamo:</h3>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Podaci o uređaju (model, operativni sustav)</li>
                <li>IP adresa</li>
                <li>Podaci o korištenju aplikacije</li>
                <li>Lokacija (samo uz vašu dozvolu)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Kako koristimo vaše podatke</h2>
              <p className="text-gray-600 mb-4">
                Vaše podatke koristimo za:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Pružanje i poboljšanje naših usluga</li>
                <li>Personalizaciju vašeg iskustva</li>
                <li>Komunikaciju s vama (obavijesti, ažuriranja, marketing)</li>
                <li>Analizu korištenja platforme</li>
                <li>Sprječavanje prijevara i zaštitu sigurnosti</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Dijeljenje podataka</h2>
              <p className="text-gray-600 mb-4">
                Vaše osobne podatke ne prodajemo trećim stranama. Podatke možemo dijeliti sa:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Partnerskim restoranima (samo agregirana, anonimizirana statistika)</li>
                <li>Pružateljima usluga koji nam pomažu u poslovanju</li>
                <li>Državnim tijelima kada je to zakonski obvezno</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Vaša prava</h2>
              <p className="text-gray-600 mb-4">
                Imate pravo na:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Pristup vašim osobnim podacima</li>
                <li>Ispravak netočnih podataka</li>
                <li>Brisanje vaših podataka (&quot;pravo na zaborav&quot;)</li>
                <li>Ograničenje obrade</li>
                <li>Prijenos podataka</li>
                <li>Povlačenje privole</li>
              </ul>
              <p className="text-gray-600 mb-4">
                Za ostvarivanje ovih prava, kontaktirajte nas na info@dinver.eu.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Sigurnost podataka</h2>
              <p className="text-gray-600 mb-4">
                Primjenjujemo tehničke i organizacijske mjere za zaštitu vaših podataka od
                neovlaštenog pristupa, gubitka ili uništenja. Međutim, nijedna metoda prijenosa
                podataka putem interneta nije 100% sigurna.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Kolačići</h2>
              <p className="text-gray-600 mb-4">
                Koristimo kolačiće i slične tehnologije za poboljšanje funkcionalnosti i
                personalizaciju sadržaja. Možete upravljati postavkama kolačića putem
                postavki vašeg preglednika.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Zadržavanje podataka</h2>
              <p className="text-gray-600 mb-4">
                Vaše podatke čuvamo dok god imate aktivan račun ili dok je potrebno za
                pružanje usluga. Nakon brisanja računa, vaši podaci će biti obrisani ili
                anonimizirani u razumnom roku.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Kontakt</h2>
              <p className="text-gray-600 mb-4">
                Za sva pitanja o privatnosti, kontaktirajte nas na:
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

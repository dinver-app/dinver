'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Locale, getMessages, defaultLocale } from '@/lib/i18n';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AppStoreButtons from '@/components/ui/AppStoreButtons';

export default function DownloadPage() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(getMessages(defaultLocale));

  useEffect(() => {
    const savedLocale = localStorage.getItem('dinver-locale') as Locale | null;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'hr')) {
      setLocale(savedLocale);
      setMessages(getMessages(savedLocale));
    }

    // Mobile detection and auto-redirect
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/i.test(userAgent);

    // Only redirect on mobile devices
    if (isIOS) {
      // Redirect to App Store for iOS devices
      window.location.href = 'https://apps.apple.com/app/dinver/id6738697175';
    } else if (isAndroid) {
      // Redirect to Google Play Store for Android devices
      window.location.href = 'https://play.google.com/store/apps/details?id=com.dinver';
    }
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(getMessages(newLocale));
    localStorage.setItem('dinver-locale', newLocale);
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Header messages={messages} locale={locale} onLocaleChange={handleLocaleChange} />

      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left - Download Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {messages.download.title}
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                {messages.download.subtitle}
              </p>

              {/* Download Buttons */}
              <div className="mb-8">
                <AppStoreButtons variant="dark" layout="vertical" size="small" />
              </div>

              <p className="text-sm text-gray-500">
                {messages.download.available}
              </p>
            </motion.div>

            {/* Right - Rotating Screenshots */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex items-center justify-center relative"
            >
              <div className="relative w-80 h-80">
                {/* Center Logo */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-24 h-24 bg-dinver-dark rounded-xl shadow-xl flex items-center justify-center">
                    <Image
                      src="/logo_long_y.png"
                      alt="Dinver Logo"
                      width={70}
                      height={23}
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>

                {/* Rotating Experience Images */}
                <div
                  className="absolute inset-0 will-change-transform"
                  style={{
                    animation: 'spin-slow 40s linear infinite',
                  }}
                >
                  {[
                    { src: '/experiences/IMG_5367.jpg', rotation: 0 },
                    { src: '/experiences/IMG_5371.jpg', rotation: 45 },
                    { src: '/experiences/IMG_5372.jpg', rotation: 90 },
                    { src: '/experiences/IMG_5373.jpg', rotation: 135 },
                    { src: '/experiences/IMG_5374.jpg', rotation: 180 },
                    { src: '/experiences/IMG_5375.jpg', rotation: 225 },
                    { src: '/experiences/IMG_5376.jpg', rotation: 270 },
                    { src: '/experiences/IMG_5377.jpg', rotation: 315 },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="absolute top-1/2 left-1/2"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${item.rotation}deg) translateY(-140px)`,
                      }}
                    >
                      <div className="w-20 h-20 rounded-xl overflow-hidden shadow-lg border-2 border-white bg-white shrink-0">
                        <Image
                          src={item.src}
                          alt={`Dinver Experience ${index + 1}`}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full aspect-square"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer messages={messages} />
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, Download } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import AppStoreButtons from '@/components/ui/AppStoreButtons';
import { Messages, Locale } from '@/lib/i18n';

interface HeaderProps {
  messages: Messages;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export default function Header({ messages, locale, onLocaleChange }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: '/#features', label: messages.nav.features },
    { href: '/#how-it-works', label: messages.nav.howItWorks },
    { href: '/#restaurants', label: messages.nav.restaurants },
    { href: '/#faq', label: 'FAQ' },
    { href: '/kontakt', label: messages.nav.contact },
  ];

  const toggleLocale = () => {
    onLocaleChange(locale === 'en' ? 'hr' : 'en');
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm'
            : 'bg-dinver-dark/80 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Logo variant={isScrolled ? 'dark' : 'light'} />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-colors font-medium ${
                    isScrolled
                      ? 'text-gray-700 hover:text-dinver-green'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-4">
              <button
                onClick={toggleLocale}
                className={`flex items-center gap-1.5 transition-colors ${
                  isScrolled
                    ? 'text-gray-600 hover:text-dinver-green'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Globe size={18} />
                <span className="font-medium">{messages.nav.language}</span>
              </button>

              {/* Download Button with Dropdown */}
              <div className="relative">
                <Button
                  size="sm"
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="flex items-center gap-2"
                >
                  <Download size={16} />
                  {messages.nav.downloadApp}
                </Button>

                <AnimatePresence>
                  {showDownloadMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDownloadMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4"
                      >
                        <AppStoreButtons variant="dark" layout="vertical" />
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden p-2 transition-colors ${
                isScrolled
                  ? 'text-gray-700 hover:text-dinver-green'
                  : 'text-white hover:text-dinver-cream'
              }`}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/20" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3 }}
              className="absolute top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-xl"
            >
              <div className="flex flex-col h-full pt-20 pb-6 px-6">
                <div className="flex flex-col gap-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-lg font-medium text-gray-700 hover:text-dinver-green transition-colors py-2"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="mt-auto flex flex-col gap-4">
                  <button
                    onClick={toggleLocale}
                    className="flex items-center gap-2 text-gray-600 hover:text-dinver-green transition-colors py-2"
                  >
                    <Globe size={20} />
                    <span className="font-medium">{messages.nav.language}</span>
                  </button>
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-3">{messages.nav.downloadApp}</p>
                    <AppStoreButtons variant="dark" layout="vertical" />
                  </div>
                </div>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

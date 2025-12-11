'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { Messages, Locale } from '@/lib/i18n';

interface HeaderProps {
  messages: Messages;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export default function Header({ messages, locale, onLocaleChange }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: '#features', label: messages.nav.features },
    { href: '#how-it-works', label: messages.nav.howItWorks },
    { href: '#restaurants', label: messages.nav.restaurants },
    { href: '#explore', label: messages.nav.explore },
    { href: '#contact', label: messages.nav.contact },
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
            ? 'bg-white/90 backdrop-blur-md shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <a href="#" className="flex-shrink-0">
              <Logo variant={isScrolled ? 'dark' : 'dark'} />
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-gray-700 hover:text-dinver-green transition-colors font-medium"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-4">
              <button
                onClick={toggleLocale}
                className="flex items-center gap-1.5 text-gray-600 hover:text-dinver-green transition-colors"
              >
                <Globe size={18} />
                <span className="font-medium">{messages.nav.language}</span>
              </button>
              <Button size="sm" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
                {messages.nav.downloadApp}
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-700 hover:text-dinver-green transition-colors"
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
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-lg font-medium text-gray-700 hover:text-dinver-green transition-colors py-2"
                    >
                      {item.label}
                    </a>
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
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {messages.nav.downloadApp}
                  </Button>
                </div>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

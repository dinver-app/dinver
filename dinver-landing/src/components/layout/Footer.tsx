import { Instagram, Facebook, Linkedin } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import AppStoreButtons from '@/components/ui/AppStoreButtons';
import { Messages } from '@/lib/i18n';

// TikTok icon (not available in lucide-react)
const TikTokIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

interface FooterProps {
  messages: Messages;
}

export default function Footer({ messages }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dinver-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Logo variant="light" />
            <p className="mt-4 text-gray-300 text-sm leading-relaxed">
              {messages.footer.tagline}
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://www.instagram.com/dinver_hr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-dinver-cream transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={22} />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61579285213824"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-dinver-cream transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={22} />
              </a>
              <a
                href="https://www.tiktok.com/@dinver_hr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-dinver-cream transition-colors"
                aria-label="TikTok"
              >
                <TikTokIcon size={22} />
              </a>
              <a
                href="https://www.linkedin.com/company/dinver/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-dinver-cream transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={22} />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{messages.footer.links.navigation}</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.home}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.about}
                </Link>
              </li>
              <li>
                <Link href="/partners" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.partners}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.contact}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{messages.footer.links.legal}</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy-policy" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.privacy}
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.terms}
                </Link>
              </li>
            </ul>
          </div>

          {/* Download */}
          <div>
            <h3 className="font-semibold text-white mb-4">Download</h3>
            <AppStoreButtons variant="light" layout="vertical" />
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-center text-gray-400 text-sm">
            © {currentYear} Dinver. Sva prava pridržana.
          </p>
        </div>
      </div>
    </footer>
  );
}

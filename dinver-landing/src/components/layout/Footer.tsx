import { Instagram, Facebook, Twitter } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import AppStoreButtons from '@/components/ui/AppStoreButtons';
import { Messages } from '@/lib/i18n';

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
                href="https://instagram.com/dinver.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-dinver-cream transition-colors"
              >
                <Instagram size={22} />
              </a>
              <a
                href="https://facebook.com/dinver.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-dinver-cream transition-colors"
              >
                <Facebook size={22} />
              </a>
              <a
                href="https://twitter.com/dinver_app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-dinver-cream transition-colors"
              >
                <Twitter size={22} />
              </a>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{messages.footer.links.company}</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.about}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.careers}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.press}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{messages.footer.links.legal}</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.privacy}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.terms}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-dinver-cream transition-colors text-sm">
                  {messages.footer.links.cookies}
                </a>
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
            {messages.footer.copyright.replace('2024', currentYear.toString())}
          </p>
        </div>
      </div>
    </footer>
  );
}

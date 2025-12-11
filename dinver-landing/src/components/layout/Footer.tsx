import { Instagram, Facebook, Twitter } from 'lucide-react';
import Logo from '@/components/ui/Logo';
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
                className="text-gray-400 hover:text-dinver-green transition-colors"
              >
                <Instagram size={22} />
              </a>
              <a
                href="https://facebook.com/dinver.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-dinver-green transition-colors"
              >
                <Facebook size={22} />
              </a>
              <a
                href="https://twitter.com/dinver_app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-dinver-green transition-colors"
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
                <a href="#" className="text-gray-300 hover:text-dinver-green transition-colors text-sm">
                  {messages.footer.links.about}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-dinver-green transition-colors text-sm">
                  {messages.footer.links.careers}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-dinver-green transition-colors text-sm">
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
                <a href="#" className="text-gray-300 hover:text-dinver-green transition-colors text-sm">
                  {messages.footer.links.privacy}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-dinver-green transition-colors text-sm">
                  {messages.footer.links.terms}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-dinver-green transition-colors text-sm">
                  {messages.footer.links.cookies}
                </a>
              </li>
            </ul>
          </div>

          {/* Download */}
          <div>
            <h3 className="font-semibold text-white mb-4">Download</h3>
            <div className="flex flex-col gap-3">
              {/* App Store Button */}
              <a
                href="#"
                className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-lg px-4 py-3"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Download on the</div>
                  <div className="text-sm font-semibold">App Store</div>
                </div>
              </a>
              {/* Google Play Button */}
              <a
                href="#"
                className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors rounded-lg px-4 py-3"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Get it on</div>
                  <div className="text-sm font-semibold">Google Play</div>
                </div>
              </a>
            </div>
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

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://dinver.app'),
  title: {
    default: 'Dinver - Discover Your Next Great Meal',
    template: '%s | Dinver',
  },
  description: 'Dinver is a gastro community platform for discovering restaurants, sharing dining experiences, and earning rewards. Follow friends, explore the experience feed, and find your next favorite restaurant.',
  keywords: [
    'restaurants',
    'dining',
    'food discovery',
    'restaurant reviews',
    'gastro community',
    'food experiences',
    'Croatia restaurants',
    'Zagreb restaurants',
    'restaurant guide',
    'food lovers',
    'dining experiences',
    'must visit restaurants',
  ],
  authors: [{ name: 'Dinver' }],
  creator: 'Dinver',
  publisher: 'Dinver',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'hr_HR',
    url: 'https://dinver.app',
    siteName: 'Dinver',
    title: 'Dinver - Discover Your Next Great Meal',
    description: 'Join the gastro community. Discover restaurants, share experiences, and earn rewards for every visit.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Dinver - Gastro Community Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dinver - Discover Your Next Great Meal',
    description: 'Join the gastro community. Discover restaurants, share experiences, and earn rewards.',
    images: ['/og-image.png'],
    creator: '@dinver_app',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: 'https://dinver.app',
    languages: {
      'en': 'https://dinver.app',
      'hr': 'https://dinver.app/hr',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

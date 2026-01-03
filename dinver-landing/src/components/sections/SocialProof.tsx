'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, MapPin, Users, Bell } from 'lucide-react';
import Image from 'next/image';
import CountUp from 'react-countup';
import {
  getLandingStats,
  getLandingExperiences,
  getPartners,
  LandingStatsResponse,
  LandingExperience,
  Partner,
} from '@/lib/api';

// Fallback data when API is not available
const FALLBACK_STATS = {
  experiences: 847,
  partners: 42,
  users: 1250,
  activeUpdates: 156,
};

const FALLBACK_PARTNERS: Partner[] = [
  { id: '1', name: 'Zinfandel\'s', address: '', place: 'Zagreb', slug: 'zinfandels', isClaimed: true },
  { id: '2', name: 'Dubravkin put', address: '', place: 'Zagreb', slug: 'dubravkin-put', isClaimed: true },
  { id: '3', name: 'Noel', address: '', place: 'Zagreb', slug: 'noel', isClaimed: true },
  { id: '4', name: 'Takenoko', address: '', place: 'Zagreb', slug: 'takenoko', isClaimed: true },
  { id: '5', name: 'Mundoaka', address: '', place: 'Zagreb', slug: 'mundoaka', isClaimed: true },
  { id: '6', name: 'Heritage', address: '', place: 'Zagreb', slug: 'heritage', isClaimed: true },
  { id: '7', name: 'Apetit City', address: '', place: 'Zagreb', slug: 'apetit-city', isClaimed: true },
  { id: '8', name: 'Mano', address: '', place: 'Zagreb', slug: 'mano', isClaimed: true },
  { id: '9', name: 'Carpaccio', address: '', place: 'Zagreb', slug: 'carpaccio', isClaimed: true },
  { id: '10', name: 'Agava', address: '', place: 'Zagreb', slug: 'agava', isClaimed: true },
];

interface SocialProofProps {
  locale: 'en' | 'hr';
}

export default function SocialProof({ locale }: SocialProofProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [stats, setStats] = useState<LandingStatsResponse['stats'] | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [experiences, setExperiences] = useState<LandingExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, partnersData, experiencesData] = await Promise.all([
          getLandingStats(),
          getPartners(),
          getLandingExperiences({ limit: 20 }),
        ]);

        setStats(statsData.stats);
        setPartners(partnersData.partners?.length ? partnersData.partners : FALLBACK_PARTNERS);
        setExperiences(experiencesData.experiences || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Fallback data
        setStats(FALLBACK_STATS);
        setPartners(FALLBACK_PARTNERS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <section ref={containerRef} className="py-16 lg:py-24 bg-white overflow-hidden">
      {/* Partners Marquee - Simple scrolling names */}
      <div className="mb-16">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          className="text-center text-lg font-semibold text-gray-600 mb-8"
        >
          {locale === 'hr' ? 'Naši partneri' : 'Our Partners'}
        </motion.h3>

        <div className="relative">
          {/* Gradient fades */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />

          {/* Scrolling partners */}
          <div className="flex animate-marquee whitespace-nowrap">
            {[...partners, ...partners].map((partner, i) => (
              <span
                key={`${partner.id}-${i}`}
                className="mx-8 text-gray-400 text-lg font-medium hover:text-dinver-green transition-colors"
              >
                {partner.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="bg-gray-50 rounded-3xl p-8 lg:p-12"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: MapPin,
                value: stats?.partners || 0,
                suffix: '',
                label: locale === 'hr' ? 'Partner restorana' : 'Partner Restaurants',
                color: 'text-dinver-green',
                bgColor: 'bg-dinver-green/10',
              },
              {
                icon: Users,
                value: stats?.users || 0,
                suffix: '',
                label: locale === 'hr' ? 'Korisnika' : 'Users',
                color: 'text-blue-600',
                bgColor: 'bg-blue-100',
              },
              {
                icon: Star,
                value: stats?.experiences || 0,
                suffix: '',
                label: locale === 'hr' ? 'Doživljaja' : 'Experiences',
                color: 'text-amber-600',
                bgColor: 'bg-amber-100',
              },
              {
                icon: Bell,
                value: stats?.activeUpdates || 0,
                suffix: '',
                label: locale === 'hr' ? "What's New objava" : "What's New Posts",
                color: 'text-purple-600',
                bgColor: 'bg-purple-100',
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 * i }}
                className="text-center"
              >
                <div
                  className={`w-14 h-14 mx-auto mb-4 rounded-2xl ${stat.bgColor} flex items-center justify-center ${stat.color}`}
                >
                  <stat.icon size={26} />
                </div>
                <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-1">
                  {isInView && stats && (
                    <CountUp
                      start={0}
                      end={stat.value}
                      duration={2.5}
                      delay={0.2 + i * 0.1}
                      separator=","
                      suffix={stat.suffix}
                    />
                  )}
                </div>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Real Experiences Marquee */}
      {experiences.length > 0 && (
        <div>
          <motion.h3
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-center text-lg font-semibold text-gray-600 mb-8"
          >
            {locale === 'hr'
              ? 'Stvarna iskustva korisnika'
              : 'Real user experiences'}
          </motion.h3>

          <div className="relative">
            {/* Gradient fades */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />

            {/* Scrolling experience images */}
            <div className="flex animate-marquee-slow gap-4">
              {[...experiences, ...experiences]
                .filter(exp => exp.images?.[0]?.url)
                .map((exp, i) => (
                <div
                  key={`${exp.id}-${i}`}
                  className="flex-shrink-0 w-64 h-44 rounded-2xl overflow-hidden relative group shadow-lg"
                >
                  <Image
                    src={exp.images[0].url}
                    alt={exp.restaurant.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Overlay with info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium truncate">
                      {exp.restaurant.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={12} className="text-amber-400" fill="currentColor" />
                      <span className="text-white/90 text-xs">{exp.rating.toFixed(1)}</span>
                      <span className="text-white/60 text-xs ml-1">
                        by {exp.author.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

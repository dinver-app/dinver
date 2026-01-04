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
          getLandingExperiences({ limit: 15 }), // Fetch 15 random experiences
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
    <section ref={containerRef} className="py-12 sm:py-16 lg:py-24 bg-white overflow-hidden">
      {/* Partners Marquee - Simple scrolling names */}
      <div className="mb-10 sm:mb-16">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          className="text-center text-base sm:text-lg font-semibold text-gray-600 mb-6 sm:mb-8"
        >
          {locale === 'hr' ? 'Naši partneri' : 'Our Partners'}
        </motion.h3>

        <div className="relative">
          {/* Gradient fades - smaller on mobile */}
          <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 lg:w-32 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 lg:w-32 bg-gradient-to-l from-white to-transparent z-10" />

          {/* Scrolling partners - non-interactive, continuous loop */}
          <div className="flex animate-marquee whitespace-nowrap pointer-events-none select-none">
            {[...partners, ...partners].map((partner, i) => (
              <span
                key={`${partner.id}-${i}`}
                className="mx-4 sm:mx-6 lg:mx-8 text-gray-400 text-sm sm:text-base lg:text-lg font-medium"
              >
                {partner.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="bg-gray-50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-12"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
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
                  className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 mx-auto mb-2 sm:mb-3 lg:mb-4 rounded-xl sm:rounded-2xl ${stat.bgColor} flex items-center justify-center ${stat.color}`}
                >
                  <stat.icon size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-0.5 sm:mb-1">
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
                <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Real Experiences Marquee */}
      {experiences.length > 0 && (() => {
        // Filter experiences with images first to avoid duplicates
        const validExperiences = experiences.filter(exp => exp.images?.[0]?.url);
        // Duplicate the array for infinite scroll effect
        const scrollExperiences = [...validExperiences, ...validExperiences];

        return (
          <div>
            <motion.h3
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              className="text-center text-base sm:text-lg font-semibold text-gray-600 mb-6 sm:mb-8"
            >
              {locale === 'hr'
                ? 'Stvarna iskustva korisnika'
                : 'Real user experiences'}
            </motion.h3>

            <div className="relative">
              {/* Gradient fades - smaller on mobile */}
              <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 lg:w-32 bg-gradient-to-r from-white to-transparent z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 lg:w-32 bg-gradient-to-l from-white to-transparent z-10" />

              {/* Scrolling experience images */}
              <div className="flex animate-marquee-slow gap-3 sm:gap-4">
                {scrollExperiences.map((exp, i) => (
                  <div
                    key={`${exp.id}-${i}`}
                    className="shrink-0 w-52 sm:w-56 lg:w-64 h-36 sm:h-40 lg:h-44 rounded-xl sm:rounded-2xl overflow-hidden relative group shadow-lg"
                  >
                    <Image
                      src={exp.images[0].url}
                      alt={exp.restaurant.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Overlay with info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3">
                      <p className="text-white text-xs sm:text-sm font-medium truncate">
                        {exp.restaurant.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={10} className="text-amber-400 sm:w-3 sm:h-3" fill="currentColor" />
                        <span className="text-white/90 text-[10px] sm:text-xs">{exp.rating.toFixed(1)}</span>
                        <span className="text-white/60 text-[10px] sm:text-xs ml-1">
                          by {exp.author.name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}

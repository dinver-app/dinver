'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Clock,
  Star,
  ChevronRight,
  X,
  Play,
  Heart,
  Share2,
  ChevronLeft,
  ChevronDown,
  Search,
  Utensils,
  Wine,
  ExternalLink,
  Calendar,
  Instagram,
  Facebook,
  Mail,
} from 'lucide-react';
import { Locale, getMessages, defaultLocale } from '@/lib/i18n';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  getRestaurantDetails,
  getPartners,
  getMenuCategories,
  getMenuItems,
  getDrinkCategories,
  getDrinkItems,
  getRestaurantExperiences,
  RestaurantDetails,
  MenuCategory,
  MenuItem,
  DrinkCategory,
  DrinkItem,
  RestaurantExperience,
  TypeItem,
} from '@/lib/api';

// TikTok icon
const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Day names for working hours
const DAY_NAMES = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  hr: ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'],
};

// Helper to format time from "HHMM" to "HH:MM"
const formatTime = (time: string): string => {
  if (!time || time.length !== 4) return time;
  return `${time.slice(0, 2)}:${time.slice(2)}`;
};

// Helper to get localized type name
const getTypeName = (item: TypeItem, locale: Locale): string => {
  return locale === 'hr' ? item.nameHr : item.nameEn;
};

export default function RestaurantDetailsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(getMessages(defaultLocale));
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [drinkCategories, setDrinkCategories] = useState<DrinkCategory[]>([]);
  const [drinkItems, setDrinkItems] = useState<DrinkItem[]>([]);
  const [experiences, setExperiences] = useState<RestaurantExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI States
  const [activeTab, setActiveTab] = useState<'food' | 'drinks'>('food');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [showVirtualTour, setShowVirtualTour] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [showAllHours, setShowAllHours] = useState(false);

  const menuSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLocale = localStorage.getItem('dinver-locale') as Locale | null;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'hr')) {
      setLocale(savedLocale);
      setMessages(getMessages(savedLocale));
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      setIsLoading(true);
      setError(null);

      try {
        // First get the restaurant ID from partners list by slug
        const partnersResponse = await getPartners();
        const foundPartner = partnersResponse.partners.find(p => p.slug === slug);

        if (!foundPartner) {
          setError('Restaurant not found');
          setIsLoading(false);
          return;
        }

        const restaurantId = foundPartner.id;

        // Fetch all data in parallel
        const [
          restaurantData,
          menuCategoriesData,
          menuItemsData,
          drinkCategoriesData,
          drinkItemsData,
          experiencesData,
        ] = await Promise.all([
          getRestaurantDetails(restaurantId),
          getMenuCategories(restaurantId).catch(() => []),
          getMenuItems(restaurantId).catch(() => []),
          getDrinkCategories(restaurantId).catch(() => []),
          getDrinkItems(restaurantId).catch(() => []),
          getRestaurantExperiences(restaurantId, { limit: 10 }).catch(() => ({ experiences: [], total: 0, limit: 10, offset: 0 })),
        ]);

        setRestaurant(restaurantData);
        setMenuCategories(menuCategoriesData);
        setMenuItems(menuItemsData);
        setDrinkCategories(drinkCategoriesData);
        setDrinkItems(drinkItemsData);
        setExperiences(experiencesData.experiences);

        // Set default selected category
        if (menuCategoriesData.length > 0) {
          setSelectedCategory(menuCategoriesData[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch restaurant data:', err);
        setError('Failed to load restaurant data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(getMessages(newLocale));
    localStorage.setItem('dinver-locale', newLocale);
  };

  // Get current day (0 = Sunday)
  const today = new Date().getDay();

  // Filter menu items by category and search
  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
    const itemName = item.translations?.find(t => t.language === locale)?.name || item.name;
    const matchesSearch = !menuSearchQuery || itemName.toLowerCase().includes(menuSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.isActive;
  });

  const filteredDrinkItems = drinkItems.filter(item => {
    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
    const itemName = item.translations?.find(t => t.language === locale)?.name || item.name;
    const matchesSearch = !menuSearchQuery || itemName.toLowerCase().includes(menuSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.isActive;
  });

  // Get working hours for display
  const getWorkingHoursDisplay = () => {
    if (!restaurant?.openingHours?.periods) return null;

    const hours: { day: number; shifts: string[] }[] = [];

    for (let day = 0; day < 7; day++) {
      const dayPeriods = restaurant.openingHours.periods.filter(p => p.open.day === day);
      if (dayPeriods.length === 0) {
        hours.push({ day, shifts: [] });
      } else {
        const shifts = dayPeriods.map(p => {
          const openTime = formatTime(p.open.time);
          const closeTime = formatTime(p.close.time);
          return `${openTime} - ${closeTime}`;
        });
        hours.push({ day, shifts });
      }
    }

    // Reorder to start from Monday (day 1)
    return [...hours.slice(1), hours[0]];
  };

  const workingHours = getWorkingHoursDisplay();

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurant?.name,
          text: restaurant?.description?.hr || restaurant?.description?.en || '',
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert(locale === 'hr' ? 'Link kopiran!' : 'Link copied!');
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <Header messages={messages} locale={locale} onLocaleChange={handleLocaleChange} />
        <div className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-64 sm:h-96 bg-gray-200 rounded-2xl mb-6" />
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        </div>
        <Footer messages={messages} />
      </main>
    );
  }

  if (error || !restaurant) {
    return (
      <main className="min-h-screen bg-white">
        <Header messages={messages} locale={locale} onLocaleChange={handleLocaleChange} />
        <div className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {locale === 'hr' ? 'Restoran nije pronađen' : 'Restaurant not found'}
            </h1>
            <Link href="/partneri" className="text-dinver-green hover:underline">
              {locale === 'hr' ? 'Pregledaj sve partnere' : 'View all partners'}
            </Link>
          </div>
        </div>
        <Footer messages={messages} />
      </main>
    );
  }

  const coverImage = restaurant.images?.[0]?.url || restaurant.thumbnailUrl;
  const description = locale === 'hr'
    ? (restaurant.description?.hr || restaurant.description?.en || '')
    : (restaurant.description?.en || restaurant.description?.hr || '');

  return (
    <main className="min-h-screen bg-gray-50">
      <Header messages={messages} locale={locale} onLocaleChange={handleLocaleChange} />

      {/* Hero Section */}
      <div className="relative pt-16 lg:pt-20">
        {/* Cover Image */}
        <div className="relative h-64 sm:h-80 lg:h-[400px] bg-gray-200">
          {coverImage && (
            <Image
              src={coverImage}
              alt={restaurant.name}
              fill
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Back button */}
          <Link
            href="/partneri"
            className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-900" />
          </Link>

          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <Share2 size={18} className="text-gray-900" />
            </button>
          </div>

          {/* Restaurant name overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                {restaurant.name}
              </h1>
              {description && (
                <p className="text-white/90 text-sm sm:text-base max-w-2xl line-clamp-2">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
          {/* Address & Status */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-dinver-green flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 font-medium">
                  {restaurant.address}
                  {restaurant.place && `, ${restaurant.place}`}
                </p>
                {restaurant.hoursStatus && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-medium ${restaurant.hoursStatus.restaurant.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                      {restaurant.hoursStatus.restaurant.isOpen
                        ? (locale === 'hr' ? 'Otvoreno' : 'Open')
                        : (locale === 'hr' ? 'Zatvoreno' : 'Closed')}
                    </span>
                    {restaurant.hoursStatus.restaurant.isOpen && restaurant.hoursStatus.restaurant.closesAt && (
                      <span className="text-sm text-gray-500">
                        {locale === 'hr' ? 'Zatvara se u' : 'Closes at'} {restaurant.hoursStatus.restaurant.closesAt}
                      </span>
                    )}
                    {!restaurant.hoursStatus.restaurant.isOpen && restaurant.hoursStatus.restaurant.opensAt && (
                      <span className="text-sm text-gray-500">
                        {locale === 'hr' ? 'Otvara se u' : 'Opens at'} {restaurant.hoursStatus.restaurant.opensAt}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Rating Badge */}
            {(restaurant.dinverRating || restaurant.rating) && (
              <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-xl">
                <Star size={18} className="text-amber-500 fill-amber-500" />
                <span className="font-bold text-gray-900">
                  {typeof restaurant.dinverRating === 'string'
                    ? parseFloat(restaurant.dinverRating).toFixed(1)
                    : (restaurant.dinverRating || restaurant.rating)?.toFixed(1)}
                </span>
                {restaurant.dinverReviewsCount && (
                  <span className="text-sm text-gray-500">
                    ({restaurant.dinverReviewsCount})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Map Button */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address} ${restaurant.place}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-dinver-green/5 rounded-xl transition-colors group"
            >
              <MapPin size={22} className="text-dinver-green" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-dinver-green">
                {locale === 'hr' ? 'Na karti' : 'Map'}
              </span>
            </a>

            {/* Menu Button */}
            <button
              onClick={() => menuSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-dinver-green/5 rounded-xl transition-colors group"
            >
              <Utensils size={22} className="text-dinver-green" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-dinver-green">
                {locale === 'hr' ? 'Meni' : 'Menu'}
              </span>
            </button>

            {/* Virtual Tour Button */}
            {restaurant.virtualTourUrl && (
              <button
                onClick={() => setShowVirtualTour(true)}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-dinver-green/5 rounded-xl transition-colors group"
              >
                <Play size={22} className="text-dinver-green" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-dinver-green">
                  {locale === 'hr' ? 'Virtualna šetnja' : 'Virtual Tour'}
                </span>
              </button>
            )}

            {/* Reserve / Download App Button */}
            <Link
              href="/#download"
              className="flex flex-col items-center gap-2 p-4 bg-dinver-green/10 hover:bg-dinver-green/20 rounded-xl transition-colors group"
            >
              <Calendar size={22} className="text-dinver-green" />
              <span className="text-sm font-medium text-dinver-green">
                {locale === 'hr' ? 'Rezervacija' : 'Reserve'}
              </span>
            </Link>
          </div>
        </div>

        {/* Two Column Layout for Desktop */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Working Hours */}
            {workingHours && workingHours.some(h => h.shifts.length > 0) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={20} className="text-dinver-green" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      {locale === 'hr' ? 'Radno vrijeme' : 'Working Hours'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowAllHours(!showAllHours)}
                    className="text-sm text-dinver-green hover:underline"
                  >
                    {showAllHours
                      ? (locale === 'hr' ? 'Sakrij' : 'Hide')
                      : (locale === 'hr' ? 'Vidi sve' : 'See all')}
                  </button>
                </div>

                <div className="space-y-2">
                  {workingHours
                    .slice(0, showAllHours ? 7 : 3)
                    .map((dayHours, index) => {
                      // Adjust index for Monday-first display
                      const actualDay = index < 6 ? index + 1 : 0;
                      const isToday = actualDay === today;

                      return (
                        <div
                          key={index}
                          className={`flex justify-between py-2 px-3 rounded-lg ${isToday ? 'bg-dinver-green/5' : ''}`}
                        >
                          <span className={`${isToday ? 'font-semibold text-dinver-green' : 'text-gray-600'}`}>
                            {DAY_NAMES[locale][actualDay]}
                          </span>
                          <span className={`${isToday ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>
                            {dayHours.shifts.length > 0
                              ? dayHours.shifts.join(', ')
                              : (locale === 'hr' ? 'Zatvoreno' : 'Closed')}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Characteristics / Amenities */}
            {(restaurant.foodTypes?.length || restaurant.mealTypes?.length || restaurant.dietaryTypes?.length || restaurant.establishmentPerks?.length) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {locale === 'hr' ? 'Karakteristike' : 'Characteristics'}
                </h2>

                <div className="space-y-5">
                  {/* Cuisine Types */}
                  {restaurant.foodTypes && restaurant.foodTypes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">
                        {locale === 'hr' ? 'Kuhinja' : 'Cuisine'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {restaurant.foodTypes.map((type) => (
                          <span
                            key={type.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full"
                          >
                            {type.icon && <span>{type.icon}</span>}
                            {getTypeName(type, locale)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meal Types */}
                  {restaurant.mealTypes && restaurant.mealTypes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">
                        {locale === 'hr' ? 'Vrste obroka' : 'Meal Types'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {restaurant.mealTypes.map((type) => (
                          <span
                            key={type.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full"
                          >
                            {type.icon && <span>{type.icon}</span>}
                            {getTypeName(type, locale)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dietary Types */}
                  {restaurant.dietaryTypes && restaurant.dietaryTypes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">
                        {locale === 'hr' ? 'Posebni prehrambeni tipovi' : 'Dietary Options'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {restaurant.dietaryTypes.map((type) => (
                          <span
                            key={type.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-full"
                          >
                            {type.icon && <span>{type.icon}</span>}
                            {getTypeName(type, locale)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Amenities */}
                  {restaurant.establishmentPerks && restaurant.establishmentPerks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">
                        {locale === 'hr' ? 'Dodatne usluge' : 'Amenities'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {restaurant.establishmentPerks.map((perk) => (
                          <span
                            key={perk.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full"
                          >
                            {perk.icon && <span>{perk.icon}</span>}
                            {getTypeName(perk, locale)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Experiences / Reviews */}
            {experiences.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={20} className="text-dinver-green" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {locale === 'hr' ? 'Doživljaji' : 'Experiences'}
                  </h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {experiences.slice(0, 4).map((exp) => (
                    <div key={exp.id} className="group">
                      {/* Image */}
                      {exp.images?.[0]?.url && (
                        <div className="relative h-40 rounded-xl overflow-hidden mb-3">
                          <Image
                            src={exp.images[0].url}
                            alt={exp.author.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute bottom-2 left-2 flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                              <Utensils size={10} />
                              <span>{exp.ratings.food.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                              <span>🏠</span>
                              <span>{exp.ratings.ambience.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                              <span>👥</span>
                              <span>{exp.ratings.service.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{exp.author.name}</p>
                        {exp.description && (
                          <p className="text-gray-600 text-sm line-clamp-2 mt-1">{exp.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <Star size={14} className="text-amber-500 fill-amber-500" />
                            <span className="text-sm font-medium">{exp.ratings.overall.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400">
                            <Heart size={14} />
                            <span className="text-sm">{exp.likesCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {experiences.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {locale === 'hr'
                        ? 'Trenutno nema dostupnih doživljaja'
                        : 'No experiences available yet'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {locale === 'hr'
                        ? 'Budi prvi koji će podijeliti svoj doživljaj!'
                        : 'Be the first to share your experience!'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Menu Section */}
            <div ref={menuSectionRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {locale === 'hr' ? 'Meni' : 'Menu'}
              </h2>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => {
                    setActiveTab('food');
                    if (menuCategories.length > 0) setSelectedCategory(menuCategories[0].id);
                  }}
                  className={`flex-1 py-3 text-center font-medium transition-colors ${
                    activeTab === 'food'
                      ? 'text-dinver-green border-b-2 border-dinver-green'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {locale === 'hr' ? 'Hrana' : 'Food'}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('drinks');
                    if (drinkCategories.length > 0) setSelectedCategory(drinkCategories[0].id);
                  }}
                  className={`flex-1 py-3 text-center font-medium transition-colors ${
                    activeTab === 'drinks'
                      ? 'text-dinver-green border-b-2 border-dinver-green'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {locale === 'hr' ? 'Pića' : 'Drinks'}
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={locale === 'hr' ? 'Pretraži stavke menija...' : 'Search menu items...'}
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-dinver-green"
                />
              </div>

              {/* Categories */}
              <div className="flex overflow-x-auto gap-2 pb-4 mb-4 -mx-4 px-4 no-scrollbar">
                {(activeTab === 'food' ? menuCategories : drinkCategories).map((cat) => {
                  const catName = cat.translations?.find(t => t.language === locale)?.name || cat.name;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-dinver-green text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {catName}
                    </button>
                  );
                })}
              </div>

              {/* Menu Items */}
              <div className="space-y-4">
                {(activeTab === 'food' ? filteredMenuItems : filteredDrinkItems).map((item) => {
                  const itemName = item.translations?.find(t => t.language === locale)?.name || item.name;
                  const itemDesc = item.translations?.find(t => t.language === locale)?.description || item.description;
                  const imageUrl = 'imageUrls' in item && item.imageUrls?.medium
                    ? item.imageUrls.medium
                    : item.imageUrl;

                  return (
                    <div key={item.id} className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      {imageUrl && (
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={imageUrl}
                            alt={itemName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900">{itemName}</h3>
                        {itemDesc && (
                          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{itemDesc}</p>
                        )}
                        <p className="text-dinver-green font-semibold mt-2">
                          {typeof item.price === 'number'
                            ? `${item.price.toFixed(2)} €`
                            : `${item.price} €`}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {(activeTab === 'food' ? filteredMenuItems : filteredDrinkItems).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {locale === 'hr' ? 'Nema stavki menija' : 'No menu items available'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Gallery */}
            {restaurant.images && restaurant.images.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {locale === 'hr' ? 'Galerija' : 'Gallery'}
                  </h2>
                  <button className="text-sm text-dinver-green hover:underline">
                    {locale === 'hr' ? 'Vidi sve' : 'See all'}
                  </button>
                </div>

                <div className="flex overflow-x-auto gap-3 -mx-4 px-4 pb-2 no-scrollbar">
                  {restaurant.images.slice(0, 8).map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setGalleryIndex(index)}
                      className="relative w-32 h-24 sm:w-40 sm:h-32 rounded-xl overflow-hidden flex-shrink-0"
                    >
                      <Image
                        src={img.url}
                        alt={`${restaurant.name} ${index + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Contact & Social */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {locale === 'hr' ? 'Kontakt' : 'Contact'}
              </h2>

              <div className="space-y-3">
                {restaurant.phone && (
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-dinver-green/5 transition-colors"
                  >
                    <Phone size={18} className="text-dinver-green" />
                    <span className="text-gray-700">{restaurant.phone}</span>
                  </a>
                )}

                {restaurant.websiteUrl && (
                  <a
                    href={restaurant.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-dinver-green/5 transition-colors"
                  >
                    <Globe size={18} className="text-dinver-green" />
                    <span className="text-gray-700 truncate">
                      {locale === 'hr' ? 'Web stranica' : 'Website'}
                    </span>
                    <ExternalLink size={14} className="text-gray-400 ml-auto" />
                  </a>
                )}

                {restaurant.email && (
                  <a
                    href={`mailto:${restaurant.email}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-dinver-green/5 transition-colors"
                  >
                    <Mail size={18} className="text-dinver-green" />
                    <span className="text-gray-700 truncate">{restaurant.email}</span>
                  </a>
                )}
              </div>

              {/* Social Links */}
              {(restaurant.igUrl || restaurant.fbUrl || restaurant.ttUrl) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">
                    {locale === 'hr' ? 'Društvene mreže' : 'Social Media'}
                  </h3>
                  <div className="flex gap-3">
                    {restaurant.igUrl && (
                      <a
                        href={restaurant.igUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-dinver-green hover:text-white transition-colors"
                      >
                        <Instagram size={18} />
                      </a>
                    )}
                    {restaurant.fbUrl && (
                      <a
                        href={restaurant.fbUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-dinver-green hover:text-white transition-colors"
                      >
                        <Facebook size={18} />
                      </a>
                    )}
                    {restaurant.ttUrl && (
                      <a
                        href={restaurant.ttUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-dinver-green hover:text-white transition-colors"
                      >
                        <TikTokIcon size={18} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Download App CTA */}
            <div className="bg-gradient-to-br from-dinver-green to-dinver-green-dark rounded-2xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">
                {locale === 'hr' ? 'Preuzmi Dinver' : 'Download Dinver'}
              </h3>
              <p className="text-white/80 text-sm mb-4">
                {locale === 'hr'
                  ? 'Rezerviraj stol, dijeli doživljaje i otkrij nove restorane!'
                  : 'Reserve tables, share experiences, and discover new restaurants!'}
              </p>
              <Link
                href="/#download"
                className="inline-flex items-center gap-2 bg-white text-dinver-green px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                {locale === 'hr' ? 'Preuzmi aplikaciju' : 'Download App'}
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer messages={messages} />

      {/* Virtual Tour Modal */}
      <AnimatePresence>
        {showVirtualTour && restaurant.virtualTourUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={() => setShowVirtualTour(false)}
          >
            <button
              onClick={() => setShowVirtualTour(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
            >
              <X size={24} />
            </button>

            <div className="absolute top-4 left-4 text-white z-10">
              <p className="text-lg font-semibold">{restaurant.name}</p>
              <p className="text-sm text-white/80">{restaurant.place}</p>
            </div>

            <div className="w-full h-full" onClick={(e) => e.stopPropagation()}>
              {restaurant.virtualTourUrl.includes('youtube') || restaurant.virtualTourUrl.includes('youtu.be') ? (
                <iframe
                  src={restaurant.virtualTourUrl.replace('watch?v=', 'embed/')}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <iframe
                  src={restaurant.virtualTourUrl}
                  className="w-full h-full"
                  allowFullScreen
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Lightbox */}
      <AnimatePresence>
        {galleryIndex !== null && restaurant.images && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setGalleryIndex(null)}
          >
            <button
              onClick={() => setGalleryIndex(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
            >
              <X size={24} />
            </button>

            {galleryIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryIndex(galleryIndex - 1);
                }}
                className="absolute left-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {galleryIndex < restaurant.images.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryIndex(galleryIndex + 1);
                }}
                className="absolute right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
              >
                <ChevronRight size={24} />
              </button>
            )}

            <div className="relative w-full max-w-4xl h-[80vh] mx-4" onClick={(e) => e.stopPropagation()}>
              <Image
                src={restaurant.images[galleryIndex].imageUrls?.large || restaurant.images[galleryIndex].url}
                alt={`${restaurant.name} ${galleryIndex + 1}`}
                fill
                className="object-contain"
              />
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {galleryIndex + 1} / {restaurant.images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

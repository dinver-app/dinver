"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
  Heart,
  Share2,
  Utensils,
  Home,
  Users,
  Download,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { Locale, getMessages, defaultLocale } from "@/lib/i18n";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getExperienceById, SingleExperience } from "@/lib/api";

// App Store and Play Store URLs
const APP_STORE_URL = "https://apps.apple.com/app/dinver/id6740519037";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.dinver.app";

// Meal type labels
const MEAL_TYPE_LABELS = {
  breakfast: { en: "Breakfast", hr: "Dorucak" },
  brunch: { en: "Brunch", hr: "Brunch" },
  lunch: { en: "Lunch", hr: "Rucak" },
  dinner: { en: "Dinner", hr: "Vecera" },
  sweet: { en: "Sweet", hr: "Slatko" },
  drinks: { en: "Drinks", hr: "Pice" },
};

export default function ExperiencePage() {
  const params = useParams();
  const experienceId = params?.id as string;

  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(getMessages(defaultLocale));
  const [experience, setExperience] = useState<SingleExperience | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    const savedLocale = localStorage.getItem("dinver-locale") as Locale | null;
    if (savedLocale && (savedLocale === "en" || savedLocale === "hr")) {
      setLocale(savedLocale);
      setMessages(getMessages(savedLocale));
    }
  }, []);

  useEffect(() => {
    const fetchExperience = async () => {
      if (!experienceId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await getExperienceById(experienceId);
        setExperience(response.experience);
      } catch (err) {
        console.error("Failed to fetch experience:", err);
        setError(
          locale === "hr"
            ? "Dozivljaj nije pronadjen"
            : "Experience not found"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchExperience();
  }, [experienceId, locale]);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(getMessages(newLocale));
    localStorage.setItem("dinver-locale", newLocale);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = experience
      ? `${experience.author.name} @ ${experience.restaurant.name}`
      : "Dinver Experience";

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: experience?.description || "",
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert(locale === "hr" ? "Link kopiran!" : "Link copied!");
    }
  };

  const handleOpenInApp = () => {
    // Deep link format: dinver://experience/{id}
    const deepLink = `dinver://experience/${experienceId}`;
    window.location.href = deepLink;

    // Fallback to app store after 2 seconds
    setTimeout(() => {
      window.location.href = /iPhone|iPad|iPod/.test(navigator.userAgent)
        ? APP_STORE_URL
        : PLAY_STORE_URL;
    }, 2000);
  };

  const getMealTypeLabel = (mealType: string | null | undefined) => {
    if (!mealType) return null;
    const labels = MEAL_TYPE_LABELS[mealType as keyof typeof MEAL_TYPE_LABELS];
    return labels ? labels[locale] : mealType;
  };

  // Render loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header
          messages={messages}
          locale={locale}
          onLocaleChange={handleLocaleChange}
        />
        <div className="pt-24 pb-32">
          <div className="max-w-2xl mx-auto px-4">
            <div className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-2xl mb-4" />
              <div className="bg-white rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-16" />
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        </div>
        <Footer messages={messages} locale={locale} />
      </main>
    );
  }

  // Render error state
  if (error || !experience) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header
          messages={messages}
          locale={locale}
          onLocaleChange={handleLocaleChange}
        />
        <div className="pt-24 pb-16">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X size={32} className="text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {locale === "hr"
                  ? "Dozivljaj nije pronadjen"
                  : "Experience not found"}
              </h1>
              <p className="text-gray-500 mb-6">
                {locale === "hr"
                  ? "Ovaj dozivljaj vise nije dostupan."
                  : "This experience is no longer available."}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-[#1A5D1A] hover:underline font-medium"
              >
                <ArrowLeft size={18} />
                {locale === "hr" ? "Natrag na pocetnu" : "Back to home"}
              </Link>
            </div>
          </div>
        </div>
        <Footer messages={messages} locale={locale} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header
        messages={messages}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />

      <div className="pt-16 lg:pt-20 pb-32 lg:pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 py-4"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">
              {locale === "hr" ? "Natrag" : "Back"}
            </span>
          </Link>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Image Carousel */}
            {experience.images.length > 0 && (
              <div className="relative aspect-square bg-gray-100">
                <Image
                  src={experience.images[currentImageIndex].url}
                  alt={
                    experience.images[currentImageIndex].caption ||
                    "Experience photo"
                  }
                  fill
                  className="object-cover cursor-pointer"
                  onClick={() => setShowGallery(true)}
                  priority
                />

                {/* Meal Type Badge */}
                {experience.mealType && (
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
                    {getMealTypeLabel(experience.mealType)}
                  </div>
                )}

                {/* Image Navigation */}
                {experience.images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setCurrentImageIndex((prev) =>
                          prev === 0 ? experience.images.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentImageIndex((prev) =>
                          prev === experience.images.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {experience.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            idx === currentImageIndex
                              ? "bg-white w-4"
                              : "bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                >
                  <Share2 size={18} className="text-gray-900" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-4 sm:p-6">
              {/* Author Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#1A5D1A]/10 flex items-center justify-center overflow-hidden">
                  {experience.author.avatarUrl ? (
                    <Image
                      src={experience.author.avatarUrl}
                      alt={experience.author.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[#1A5D1A] font-semibold">
                      {experience.author.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {experience.author.name}
                  </p>
                  {experience.author.username && (
                    <p className="text-sm text-gray-500">
                      @{experience.author.username}
                    </p>
                  )}
                </div>
              </div>

              {/* Restaurant Info */}
              <Link
                href={`/restoran/${experience.restaurant.slug}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4 hover:bg-gray-100 transition-colors"
              >
                {experience.restaurant.thumbnailUrl && (
                  <Image
                    src={experience.restaurant.thumbnailUrl}
                    alt={experience.restaurant.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {experience.restaurant.name}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin size={14} />
                    <span className="truncate">
                      {experience.restaurant.place ||
                        experience.restaurant.address}
                    </span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400 shrink-0" />
              </Link>

              {/* Ratings */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Utensils size={14} className="text-[#1A5D1A]" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {experience.ratings.food.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {locale === "hr" ? "Hrana" : "Food"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Home size={14} className="text-[#1A5D1A]" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {experience.ratings.ambience.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {locale === "hr" ? "Ambijent" : "Ambience"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users size={14} className="text-[#1A5D1A]" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {experience.ratings.service.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {locale === "hr" ? "Usluga" : "Service"}
                  </p>
                </div>
              </div>

              {/* Overall Rating */}
              <div className="flex items-center justify-center gap-2 mb-4 py-3 bg-amber-50 rounded-xl">
                <Star size={20} className="text-amber-500 fill-amber-500" />
                <span className="text-xl font-bold text-gray-900">
                  {experience.ratings.overall.toFixed(1)}
                </span>
                <span className="text-gray-500 text-sm">
                  {locale === "hr" ? "Ukupna ocjena" : "Overall rating"}
                </span>
              </div>

              {/* Description */}
              {experience.description && (
                <p className="text-gray-700 mb-4 whitespace-pre-wrap leading-relaxed">
                  {experience.description}
                </p>
              )}

              {/* Engagement Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <Heart size={16} />
                  <span>{experience.likesCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Share2 size={16} />
                  <span>{experience.sharesCount}</span>
                </div>
                {experience.publishedAt && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Calendar size={14} />
                    <span>
                      {new Date(experience.publishedAt).toLocaleDateString(
                        locale === "hr" ? "hr-HR" : "en-US",
                        { year: "numeric", month: "short", day: "numeric" }
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex gap-3 mt-6">
            <button
              onClick={handleOpenInApp}
              className="flex-1 flex items-center justify-center gap-2 bg-[#1A5D1A] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#1A5D1A]/90 transition-colors"
            >
              <ExternalLink size={18} />
              {locale === "hr" ? "Otvori u aplikaciji" : "Open in app"}
            </button>
            <Link
              href="/download"
              className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Download size={18} />
              {locale === "hr" ? "Preuzmi aplikaciju" : "Download app"}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-40">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <button
            onClick={handleOpenInApp}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1A5D1A] text-white font-semibold py-3 px-4 rounded-xl"
          >
            <ExternalLink size={18} />
            {locale === "hr" ? "Otvori u aplikaciji" : "Open in app"}
          </button>
          <Link
            href="/download"
            className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold py-3 px-4 rounded-xl"
          >
            <Download size={18} />
            {locale === "hr" ? "Preuzmi" : "Download"}
          </Link>
        </div>
      </div>

      <Footer messages={messages} locale={locale} />

      {/* Fullscreen Gallery Modal */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={() => setShowGallery(false)}
          >
            <button
              onClick={() => setShowGallery(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10 hover:bg-white/30 transition-colors"
            >
              <X size={24} />
            </button>

            {experience.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) =>
                      prev === 0 ? experience.images.length - 1 : prev - 1
                    );
                  }}
                  className="absolute left-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10 hover:bg-white/30 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) =>
                      prev === experience.images.length - 1 ? 0 : prev + 1
                    );
                  }}
                  className="absolute right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10 hover:bg-white/30 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <div
              className="relative w-full max-w-4xl h-[80vh] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={experience.images[currentImageIndex].url}
                alt={
                  experience.images[currentImageIndex].caption ||
                  "Experience photo"
                }
                fill
                className="object-contain"
              />
            </div>

            {/* Caption */}
            {experience.images[currentImageIndex].caption && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg max-w-md text-center">
                {experience.images[currentImageIndex].caption}
              </div>
            )}

            {experience.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                {currentImageIndex + 1} / {experience.images.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

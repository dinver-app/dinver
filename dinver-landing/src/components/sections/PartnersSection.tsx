"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Menu,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Bell,
  Check,
  Camera,
  Sparkles,
  Calendar,
} from "lucide-react";
import Image from "next/image";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Messages } from "@/lib/i18n";

interface PartnersSectionProps {
  messages: Messages;
  locale: "en" | "hr";
}

export default function PartnersSection({
  messages,
  locale,
}: PartnersSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const [activeFeature, setActiveFeature] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile for responsive transforms
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // All 7 partner features with screenshots
  const partnerFeatures = [
    {
      id: 0,
      icon: Camera,
      title: locale === "hr" ? "Virtualna šetnja 360°" : "360° Virtual Tour",
      shortTitle: locale === "hr" ? "360° šetnja" : "360° Tour",
      description:
        locale === "hr"
          ? "Omogući gostima da istraže tvoj prostor prije dolaska"
          : "Let guests explore your space before visiting",
      screenshot: "/screenshots/virtual-tour.PNG",
    },
    {
      id: 1,
      icon: Menu,
      title: locale === "hr" ? "Interaktivni meni" : "Interactive Menu",
      shortTitle: locale === "hr" ? "Meni" : "Menu",
      description:
        locale === "hr"
          ? "Prikaži jela sa slikama i opisima"
          : "Showcase dishes with photos and descriptions",
      screenshot: "/screenshots/meni.PNG",
    },
    {
      id: 2,
      icon: Bell,
      title: locale === "hr" ? "What's New objave" : "What's New Posts",
      shortTitle: "What's New",
      description:
        locale === "hr"
          ? "Najavi događaje, promocije i nova jela"
          : "Announce events, specials, and new dishes",
      screenshot: "/screenshots/whats-new.PNG",
    },
    {
      id: 3,
      icon: MapPin,
      title: locale === "hr" ? "Profil restorana" : "Restaurant Profile",
      shortTitle: locale === "hr" ? "Profil" : "Profile",
      description:
        locale === "hr"
          ? "Sve informacije na jednom mjestu"
          : "All information in one place",
      screenshot: "/screenshots/restaurant-profile.PNG",
    },
    {
      id: 4,
      icon: BarChart3,
      title: locale === "hr" ? "Analitika i statistike" : "Analytics & Stats",
      shortTitle: locale === "hr" ? "Analitika" : "Analytics",
      description:
        locale === "hr"
          ? "Prati performanse i razumij svoje goste"
          : "Track performance and understand your guests",
      screenshot: "/screenshots/analytics.PNG",
    },
    {
      id: 5,
      icon: Clock,
      title: locale === "hr" ? "Radno vrijeme" : "Working Hours",
      shortTitle: locale === "hr" ? "Radno vrijeme" : "Hours",
      description:
        locale === "hr"
          ? "Upravljaj radnim vremenom jednostavno"
          : "Manage your working hours easily",
      screenshot: "/screenshots/working-hours.PNG",
    },
    {
      id: 6,
      icon: Calendar,
      title: locale === "hr" ? "Rezervacije" : "Reservations",
      shortTitle: locale === "hr" ? "Rezervacije" : "Reservations",
      description:
        locale === "hr"
          ? "Primaj rezervacije stolova direktno kroz aplikaciju"
          : "Accept table reservations directly through the app",
      screenshot: "/screenshots/reservation.PNG",
    },
  ];

  const comparisonFeatures = [
    {
      feature: locale === "hr" ? "Osnovne informacije" : "Basic info",
      basic: true,
      partner: true,
    },
    {
      feature: locale === "hr" ? "Experience recenzije" : "Experience reviews",
      basic: true,
      partner: true,
    },
    {
      feature: locale === "hr" ? "Virtualna šetnja" : "Virtual tour",
      basic: false,
      partner: true,
    },
    {
      feature: locale === "hr" ? "Interaktivni meni" : "Interactive menu",
      basic: false,
      partner: true,
    },
    {
      feature: locale === "hr" ? "What's New objave" : "What's New posts",
      basic: false,
      partner: true,
    },
    {
      feature: locale === "hr" ? "Analitika" : "Analytics",
      basic: false,
      partner: true,
    },
    {
      feature: locale === "hr" ? "Rezervacije" : "Reservations",
      basic: false,
      partner: true,
    },
  ];

  const nextFeature = () => {
    setActiveFeature((prev) => (prev + 1) % partnerFeatures.length);
  };

  const prevFeature = () => {
    setActiveFeature(
      (prev) => (prev - 1 + partnerFeatures.length) % partnerFeatures.length
    );
  };

  // Responsive transform values for phone stack
  const getTransform = (offset: number) => {
    const multiplier = isMobile ? 0.5 : 1;

    if (offset === 0) {
      return { x: 0, scale: 1, rotate: 0, zIndex: 10, opacity: 1 };
    }
    if (offset === 1 || offset === -6) {
      return {
        x: 50 * multiplier,
        scale: 0.88,
        rotate: 4,
        zIndex: 5,
        opacity: 0.7,
      };
    }
    if (offset === -1 || offset === 6) {
      return {
        x: -50 * multiplier,
        scale: 0.88,
        rotate: -4,
        zIndex: 5,
        opacity: 0.7,
      };
    }
    if (offset === 2 || offset === -5) {
      return {
        x: 85 * multiplier,
        scale: 0.76,
        rotate: 8,
        zIndex: 2,
        opacity: 0.4,
      };
    }
    if (offset === -2 || offset === 5) {
      return {
        x: -85 * multiplier,
        scale: 0.76,
        rotate: -8,
        zIndex: 2,
        opacity: 0.4,
      };
    }
    return {
      x: (offset > 0 ? 100 : -100) * multiplier,
      scale: 0.65,
      rotate: offset > 0 ? 12 : -12,
      zIndex: 1,
      opacity: isMobile ? 0 : 0.2,
    };
  };

  return (
    <section
      ref={containerRef}
      id="restaurants"
      className="py-16 sm:py-24 lg:py-32 bg-dinver-dark overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-dinver-cream rounded-full text-sm font-semibold mb-4 sm:mb-6"
          >
            <Sparkles size={16} />
            {locale === "hr" ? "Za restorane" : "For Restaurants"}
          </motion.span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
            {messages.forRestaurants.title}
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-400">
            {messages.forRestaurants.subtitle}
          </p>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Feature info & buttons - FIRST on mobile */}
          <AnimatedSection
            direction="right"
            className="space-y-4 sm:space-y-6 order-1 lg:order-2"
          >
            {/* Feature description card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-dinver-cream rounded-xl flex items-center justify-center shrink-0">
                    {(() => {
                      const Icon = partnerFeatures[activeFeature].icon;
                      return (
                        <Icon
                          className="text-dinver-dark"
                          size={isMobile ? 24 : 28}
                        />
                      );
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">
                      {partnerFeatures[activeFeature].title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-400">
                      {partnerFeatures[activeFeature].description}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Feature buttons - horizontal scroll on mobile */}
            <div className="relative -mx-4 sm:mx-0">
              <div className="flex gap-2 overflow-x-auto px-4 sm:px-0 pb-2 sm:pb-0 sm:flex-wrap sm:overflow-visible scrollbar-hide">
                {partnerFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  const isActive = index === activeFeature;

                  return (
                    <motion.button
                      key={index}
                      onClick={() => setActiveFeature(index)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 ${
                        isActive
                          ? "bg-dinver-cream text-dinver-dark shadow-lg"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      }`}
                    >
                      <Icon size={isMobile ? 14 : 16} />
                      <span className="sm:hidden">{feature.shortTitle}</span>
                      <span className="hidden sm:inline">{feature.title}</span>
                    </motion.button>
                  );
                })}
              </div>
              {/* Scroll hint gradient for mobile */}
              <div className="absolute right-0 top-0 bottom-2 w-8 bg-linear-to-l from-dinver-dark to-transparent pointer-events-none sm:hidden" />
            </div>

            {/* CTA */}
            <div className="pt-4 sm:pt-6">
              <button
                onClick={() =>
                  document
                    .getElementById("contact")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center bg-white text-dinver-dark font-medium px-4 sm:px-5 py-2 text-sm rounded-md"
              >
                {messages.forRestaurants.cta}
                <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          </AnimatedSection>

          {/* Stacked phone cards - SECOND on mobile */}
          <AnimatedSection direction="left" className="order-2 lg:order-1">
            <div className="relative h-[380px] sm:h-[450px] lg:h-[520px] flex items-center justify-center">
              {/* All phones stacked */}
              {partnerFeatures.map((feature, index) => {
                const offset = index - activeFeature;
                const transform = getTransform(offset);

                return (
                  <motion.div
                    key={feature.id}
                    animate={{
                      x: transform.x,
                      scale: transform.scale,
                      rotate: transform.rotate,
                      opacity: transform.opacity,
                      zIndex: transform.zIndex,
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    onClick={() => setActiveFeature(index)}
                    className="absolute cursor-pointer"
                  >
                    <div
                      className={`relative w-[180px] sm:w-[200px] lg:w-[220px] h-[360px] sm:h-[400px] lg:h-[440px] bg-gray-900 rounded-[2rem] sm:rounded-[2.5rem] p-1 sm:p-1.5 shadow-2xl transition-shadow ${
                        index === activeFeature ? "shadow-dinver-cream/20" : ""
                      }`}
                    >
                      {/* Screen */}
                      <div className="w-full h-full bg-white rounded-[1.75rem] sm:rounded-4xl overflow-hidden relative">
                        <Image
                          src={feature.screenshot}
                          alt={feature.title}
                          fill
                          className="object-cover object-top"
                        />
                      </div>
                      {/* Phone notch */}
                      <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 w-12 sm:w-16 h-4 sm:h-5 bg-gray-900 rounded-full" />
                    </div>
                  </motion.div>
                );
              })}

              {/* Navigation arrows */}
              <button
                onClick={prevFeature}
                className="absolute left-2 sm:left-0 z-20 w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                aria-label="Previous feature"
              >
                <ChevronLeft className="text-white" size={18} />
              </button>
              <button
                onClick={nextFeature}
                className="absolute right-2 sm:right-0 z-20 w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                aria-label="Next feature"
              >
                <ChevronRight className="text-white" size={18} />
              </button>
            </div>
          </AnimatedSection>
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          className="mt-16 sm:mt-24"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-white text-center mb-6 sm:mb-8">
            {locale === "hr"
              ? "Usporedba: Obični profil vs Partner"
              : "Comparison: Basic vs Partner"}
          </h3>

          <div className="max-w-2xl mx-auto bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 bg-white/5 p-3 sm:p-4 border-b border-white/10">
              <div className="font-medium text-gray-400 text-xs sm:text-sm">
                {locale === "hr" ? "Mogućnost" : "Feature"}
              </div>
              <div className="text-center font-medium text-gray-400 text-xs sm:text-sm">
                {locale === "hr" ? "Obični" : "Basic"}
              </div>
              <div className="text-center font-medium text-dinver-cream text-xs sm:text-sm">
                Partner
              </div>
            </div>

            {/* Rows */}
            {comparisonFeatures.map((row, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 1 + index * 0.05 }}
                className="grid grid-cols-3 p-3 sm:p-4 border-b border-white/5 last:border-0"
              >
                <div className="text-gray-300 text-xs sm:text-sm">
                  {row.feature}
                </div>
                <div className="text-center">
                  {row.basic ? (
                    <Check
                      className="inline-block text-gray-500"
                      size={isMobile ? 16 : 20}
                    />
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </div>
                <div className="text-center">
                  <Check
                    className="inline-block text-dinver-cream"
                    size={isMobile ? 16 : 20}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

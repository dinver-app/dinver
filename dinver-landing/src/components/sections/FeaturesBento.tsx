"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Sparkles,
  Trophy,
  Bookmark,
  Search,
  View,
  Calendar,
} from "lucide-react";
import { Messages } from "@/lib/i18n";

interface FeaturesBentoProps {
  messages: Messages;
  locale: "en" | "hr";
}

export default function FeaturesBento({
  messages,
  locale,
}: FeaturesBentoProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Infinite scroll loop - Desktop only logic
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Only run this logic if we are on desktop (roughly check, but the Ref will only be attached to desktop view)
    // Actually, since we will render this container only on lg screens via CSS,
    // we can keep the logic as is, ensuring we check if container exists.

    const cardWidth = 320 + 24; // card width + gap
    const totalWidth = cardWidth * 7; // 7 original cards

    const handleScroll = () => {
      // When scrolled to the cloned end, jump to start
      if (container.scrollLeft >= totalWidth) {
        container.scrollLeft = container.scrollLeft - totalWidth;
      }
      // When scrolled before start, jump to end
      if (container.scrollLeft <= 0) {
        container.scrollLeft = container.scrollLeft + totalWidth;
      }
    };

    container.addEventListener("scroll", handleScroll);

    // Start in the middle (at first set of cards)
    container.scrollLeft = cardWidth;

    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth drag to scroll - Desktop only
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;
    let velX = 0;
    let momentumID: number;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX;
      scrollLeft = container.scrollLeft;
      cancelAnimationFrame(momentumID);
    };

    const handleMouseLeave = () => {
      if (isDown) {
        isDown = false;
        beginMomentum();
      }
    };

    const handleMouseUp = () => {
      if (isDown) {
        isDown = false;
        beginMomentum();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX;
      const walk = (startX - x) * 1.2;
      velX = startX - x;
      startX = x;
      container.scrollLeft = scrollLeft + walk;
      scrollLeft = container.scrollLeft;
    };

    const beginMomentum = () => {
      const friction = 0.95;
      const momentum = () => {
        velX *= friction;
        container.scrollLeft += velX * 0.5;
        if (Math.abs(velX) > 0.5) {
          momentumID = requestAnimationFrame(momentum);
        }
      };
      momentum();
    };

    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mousemove", handleMouseMove);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(momentumID);
    };
  }, []);

  const features = [
    {
      icon: Sparkles,
      title: messages.features.items.experiences.title,
      description: messages.features.items.experiences.description,
      gradient: "from-purple-100 to-pink-100",
      iconColor: "text-purple-600",
      iconBg: "bg-purple-200",
      badge: locale === "hr" ? "Jedinstveno na tržištu" : "Unique feature",
      badgeColor: "bg-purple-600",
    },
    {
      icon: Trophy,
      title: messages.features.items.rewards.title,
      description: messages.features.items.rewards.description,
      gradient: "from-amber-100 to-orange-100",
      iconColor: "text-amber-600",
      iconBg: "bg-amber-200",
      badge: locale === "hr" ? "Mystery Box" : "Mystery Box",
      badgeColor: "bg-amber-600",
    },
    {
      icon: Users,
      title: messages.features.items.community.title,
      description: messages.features.items.community.description,
      gradient: "from-blue-100 to-cyan-100",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-200",
    },
    {
      icon: Bookmark,
      title: messages.features.items.lists.title,
      description: messages.features.items.lists.description,
      gradient: "from-rose-100 to-pink-100",
      iconColor: "text-rose-600",
      iconBg: "bg-rose-200",
    },
    {
      icon: Search,
      title: messages.features.items.search.title,
      description: messages.features.items.search.description,
      gradient: "from-emerald-100 to-teal-100",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-200",
    },
    {
      icon: View,
      title: messages.features.items.details.title,
      description: messages.features.items.details.description,
      gradient: "from-cyan-100 to-sky-100",
      iconColor: "text-cyan-600",
      iconBg: "bg-cyan-200",
    },
    {
      icon: Calendar,
      title: messages.features.items.reservations.title,
      description: messages.features.items.reservations.description,
      gradient: "from-green-100 to-emerald-100",
      iconColor: "text-green-600",
      iconBg: "bg-green-200",
      badgeColor: "bg-green-600",
    },
  ];

  return (
    <section id="features" className="py-24 lg:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-2 bg-dinver-green/10 text-dinver-green rounded-full text-sm font-semibold mb-6"
          >
            {locale === "hr" ? "Za korisnike" : "For users"}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {messages.features.title}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {messages.features.subtitle}
          </p>
        </motion.div>
      </div>

      {/* Mobile View: Vertical Stack */}
      <div className="lg:hidden px-4 sm:px-6">
        <div className="flex flex-col gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-linear-to-br ${feature.gradient} rounded-3xl p-6 shadow-sm`}
            >
              {feature.badge && (
                <span
                  className={`absolute top-4 right-4 ${feature.badgeColor} text-white text-xs font-semibold px-3 py-1 rounded-full`}
                >
                  {feature.badge}
                </span>
              )}

              <div
                className={`w-14 h-14 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-5`}
              >
                <feature.icon className={feature.iconColor} size={28} />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Desktop View: Horizontal Scrolling Bento */}
      <div className="hidden lg:block relative">
        {/* Gradient fades on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-white to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-8 lg:px-16 pb-4 cursor-grab active:cursor-grabbing select-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {/* Triple the cards for infinite loop effect */}
          {[...features, ...features, ...features].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (index % 7) * 0.05 }}
              className="shrink-0 w-[320px]"
            >
              <div
                className={`relative bg-linear-to-br ${feature.gradient} rounded-3xl p-6 h-full min-h-[280px] shadow-sm hover:shadow-lg transition-shadow duration-300`}
              >
                {/* Badge */}
                {feature.badge && (
                  <span
                    className={`absolute top-4 right-4 ${feature.badgeColor} text-white text-xs font-semibold px-3 py-1 rounded-full`}
                  >
                    {feature.badge}
                  </span>
                )}

                {/* Icon */}
                <div
                  className={`w-14 h-14 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-5`}
                >
                  <feature.icon className={feature.iconColor} size={28} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 pointer-events-none">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm pointer-events-none">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

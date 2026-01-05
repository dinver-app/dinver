"use client";

import { motion } from "framer-motion";
import { Eye, BarChart3, Bell, Users, Calendar } from "lucide-react";
import Image from "next/image";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";
import { Messages } from "@/lib/i18n";

interface ForRestaurantsProps {
  messages: Messages;
}

export default function ForRestaurants({ messages }: ForRestaurantsProps) {
  const benefits = [
    {
      icon: Eye,
      title: messages.forRestaurants.benefits.visibility.title,
      description: messages.forRestaurants.benefits.visibility.description,
    },
    {
      icon: BarChart3,
      title: messages.forRestaurants.benefits.analytics.title,
      description: messages.forRestaurants.benefits.analytics.description,
    },
    {
      icon: Bell,
      title: messages.forRestaurants.benefits.updates.title,
      description: messages.forRestaurants.benefits.updates.description,
    },
    {
      icon: Users,
      title: messages.forRestaurants.benefits.community.title,
      description: messages.forRestaurants.benefits.community.description,
    },
    {
      icon: Calendar,
      title: messages.forRestaurants.benefits.reservations.title,
      description: messages.forRestaurants.benefits.reservations.description,
    },
  ];

  return (
    <section
      id="restaurants"
      className="py-24 lg:py-32 bg-linear-to-b from-gray-50 to-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Dashboard Preview */}
          <AnimatedSection direction="left" className="order-2 lg:order-1">
            <div className="relative">
              {/* Browser frame */}
              <div className="bg-gray-900 rounded-2xl p-1 shadow-2xl">
                {/* Browser header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 rounded-t-xl">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  </div>
                  <div className="flex-1 ml-4">
                    <div className="bg-gray-700 rounded-md px-3 py-1 text-gray-400 text-xs">
                      dashboard.dinver.app
                    </div>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="bg-white rounded-b-xl p-6">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="font-bold text-gray-900">
                        Restaurant Dashboard
                      </h4>
                      <p className="text-sm text-gray-500">
                        Welcome back, La Pergola
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-dinver-green rounded-lg flex items-center justify-center">
                      <BarChart3 className="text-white" size={20} />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-2xl font-bold text-gray-900">1.2K</p>
                      <p className="text-xs text-gray-500">Views this week</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <p className="text-2xl font-bold text-dinver-green">
                        +24%
                      </p>
                      <p className="text-xs text-gray-500">Engagement</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-2xl font-bold text-gray-900">156</p>
                      <p className="text-xs text-gray-500">Menu clicks</p>
                    </div>
                  </div>

                  {/* Chart placeholder */}
                  <div className="bg-gray-50 rounded-xl p-4 h-32 flex items-end gap-1">
                    {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                        className="flex-1 bg-dinver-green/60 rounded-t"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Phone with reservation screenshot */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="absolute -right-8 sm:-right-12 lg:-right-16 top-1/2 -translate-y-1/2"
              >
                <div className="relative w-[120px] sm:w-[140px] lg:w-[160px] h-[240px] sm:h-[280px] lg:h-[320px] bg-gray-900 rounded-3xl sm:rounded-4xl p-1 sm:p-1.5 shadow-2xl">
                  <div className="w-full h-full bg-white rounded-[1.25rem] sm:rounded-3xl overflow-hidden relative">
                    <Image
                      src="/screenshots/reservation.PNG"
                      alt="Reservation screen"
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Floating notification */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -left-4 top-1/4 bg-white rounded-xl shadow-lg p-3 border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-dinver-green rounded-lg flex items-center justify-center">
                    <Calendar className="text-white" size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-medium">New reservation!</p>
                    <p className="text-xs text-gray-500">Tonight, 8 PM</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>

          {/* Content */}
          <AnimatedSection direction="right" className="order-1 lg:order-2">
            <span className="inline-block px-4 py-2 bg-dinver-green/10 text-dinver-green rounded-full text-sm font-semibold mb-6">
              B2B
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
              {messages.forRestaurants.title}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {messages.forRestaurants.subtitle}
            </p>

            <div className="mt-10 space-y-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="shrink-0 w-12 h-12 bg-dinver-green/10 rounded-xl flex items-center justify-center">
                    <benefit.icon className="text-dinver-green" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() =>
                  document
                    .getElementById("contact")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                {messages.forRestaurants.cta}
              </Button>
              <Button variant="ghost">
                {messages.forRestaurants.ctaSecondary}
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

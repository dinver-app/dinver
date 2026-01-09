"use client";

import { motion } from "framer-motion";
import { Store, Building2, MessageCircle, ChevronDown } from "lucide-react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Messages } from "@/lib/i18n";

interface PricingProps {
  messages: Messages;
  locale: string;
}

export default function Pricing({ messages, locale }: PricingProps) {
  const plans = [
    {
      name: locale === "hr" ? "Starter" : "Starter",
      description:
        locale === "hr"
          ? "Idealno za pojedinačne restorane"
          : "Perfect for individual restaurants",
      price: "49,99",
      period: locale === "hr" ? "/mj" : "/mo",
      icon: Store,
      restaurants: locale === "hr" ? "1 restoran" : "1 restaurant",
    },
    {
      name: locale === "hr" ? "Business" : "Business",
      description:
        locale === "hr"
          ? "Za manje grupe restorana"
          : "For smaller restaurant groups",
      price: "89,99",
      period: locale === "hr" ? "/mj" : "/mo",
      icon: Building2,
      restaurants: locale === "hr" ? "Do 3 restorana" : "Up to 3 restaurants",
    },
    {
      name: locale === "hr" ? "Enterprise" : "Enterprise",
      description:
        locale === "hr"
          ? "Prilagođeno za veće grupe restorana"
          : "Custom solution for larger restaurant groups",
      price: locale === "hr" ? "Po dogovoru" : "Custom pricing",
      period: "",
      icon: MessageCircle,
      restaurants: locale === "hr" ? "4+ restorana" : "4+ restaurants",
    },
  ];

  const features = [
    locale === "hr" ? "Virtualna tura restorana" : "Virtual restaurant tour",
    locale === "hr" ? "Digitalni jelovnik" : "Digital menu",
    locale === "hr" ? "Što je novo sekcija" : "What's new section",
    locale === "hr" ? "Partner profil" : "Partner profile",
    locale === "hr" ? "Analitika i statistike" : "Analytics & statistics",
    locale === "hr" ? "Radno vrijeme" : "Working hours management",
    locale === "hr" ? "Online rezervacije" : "Online reservations",
  ];

  return (
    <section id="pricing" className="pt-12 lg:pt-16 pb-12 lg:pb-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {locale === "hr"
              ? "Jednostavne i transparentne cijene"
              : "Simple and transparent pricing"}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {locale === "hr"
              ? "Odaberi paket koji najbolje odgovara tvojim potrebama"
              : "Choose the plan that best fits your needs"}
          </p>
          <p className="mt-2 text-sm text-dinver-green font-medium">
            {locale === "hr"
              ? "Bez ugovorne obveze - otkaži kad god želiš"
              : "No contract - cancel anytime"}
          </p>
        </AnimatedSection>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {plans.map((plan, index) => (
            <AnimatedSection key={plan.name} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                className="relative h-full rounded-3xl p-8 transition-all bg-white border border-gray-200 shadow-lg shadow-gray-100/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-dinver-green/10">
                    <plan.icon size={24} className="text-dinver-green" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-500">{plan.restaurants}</p>
                  </div>
                </div>

                <p className="text-sm mb-6 text-gray-600">{plan.description}</p>

                <div>
                  <div className="flex items-baseline gap-1">
                    {plan.price !== "Po dogovoru" &&
                    plan.price !== "Custom pricing" ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">
                          {locale === "hr"
                            ? `${plan.price} €`
                            : `€${plan.price.replace(",", ".")}`}
                        </span>
                        <span className="text-lg text-gray-500">
                          {plan.period}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold text-gray-900">
                        {plan.price}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>

        {/* Animated scroll indicator */}
        <div className="flex justify-center mt-4">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-gray-400"
          >
            <ChevronDown size={32} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

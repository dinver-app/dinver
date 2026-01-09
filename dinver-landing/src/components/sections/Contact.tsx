"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Mail,
  MapPin,
  Store,
} from "lucide-react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Button from "@/components/ui/Button";
import { Messages } from "@/lib/i18n";
import { submitPartnershipInquiry } from "@/lib/api";

interface ContactProps {
  messages: Messages;
  locale?: string;
}

export default function Contact({ messages, locale = "hr" }: ContactProps) {
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      await submitPartnershipInquiry({ email, city, restaurantName });

      setStatus("success");
      setEmail("");
      setCity("");
      setRestaurantName("");

      setTimeout(() => setStatus("idle"), 5000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : messages.contact.form.error
      );

      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  return (
    <section
      id="contact"
      className="py-24 lg:py-32 bg-linear-to-b from-white to-gray-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {messages.forRestaurants.subtitle}
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {messages.contact.restaurant.description}
          </p>
        </AnimatedSection>

        <div className="max-w-xl mx-auto">
          <AnimatedSection>
            <motion.div
              layout
              className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100"
            >
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-dinver-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="text-dinver-green" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {messages.contact.form.success.split("!")[0]}!
                    </h3>
                    <p className="text-gray-600">
                      {messages.contact.form.success.split("!")[1] ||
                        messages.contact.form.successMessage}
                    </p>
                  </motion.div>
                ) : status === "error" ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="text-red-500" size={32} />
                    </div>
                    <p className="text-gray-900 font-medium">
                      {errorMessage || messages.contact.form.error}
                    </p>
                    <button
                      onClick={() => setStatus("idle")}
                      className="mt-4 text-dinver-green hover:underline text-sm font-medium"
                    >
                      {locale === "en" ? "Try again" : "Pokušaj ponovno"}
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    <div>
                      <label
                        htmlFor="restaurantName"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                      >
                        <Store size={16} className="text-dinver-green" />
                        {locale === "en"
                          ? "Restaurant name"
                          : "Naziv restorana"}
                      </label>
                      <input
                        type="text"
                        id="restaurantName"
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                        placeholder={
                          locale === "en"
                            ? "The name of your restaurant"
                            : "Naziv tvojeg restorana"
                        }
                        required
                        minLength={2}
                        maxLength={200}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-dinver-green focus:ring-2 focus:ring-dinver-green/20 outline-none transition-all bg-gray-50/50"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                      >
                        <Mail size={16} className="text-dinver-green" />
                        {messages.contact.form.email}
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="restaurant@example.com"
                        required
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-dinver-green focus:ring-2 focus:ring-dinver-green/20 outline-none transition-all bg-gray-50/50"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="city"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                      >
                        <MapPin size={16} className="text-dinver-green" />
                        {messages.contact.form.city}
                      </label>
                      <input
                        type="text"
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder={
                          locale === "en"
                            ? "Zagreb, London, Paris.."
                            : "Zagreb, Split, Rijeka..."
                        }
                        required
                        minLength={2}
                        maxLength={100}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-dinver-green focus:ring-2 focus:ring-dinver-green/20 outline-none transition-all bg-gray-50/50"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={status === "loading"}
                      className="w-full mt-6"
                      size="lg"
                    >
                      {status === "loading" ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          {messages.contact.form.submitting}
                        </>
                      ) : (
                        <>
                          {messages.forRestaurants.cta}
                          <Send size={18} className="ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

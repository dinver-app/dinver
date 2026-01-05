"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Star,
  Phone,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Locale, getMessages, defaultLocale } from "@/lib/i18n";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getPartners, Partner } from "@/lib/api";

export default function PartneriPage() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(getMessages(defaultLocale));
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    const savedLocale = localStorage.getItem("dinver-locale") as Locale | null;
    if (savedLocale && (savedLocale === "en" || savedLocale === "hr")) {
      setLocale(savedLocale);
      setMessages(getMessages(savedLocale));
    }
  }, []);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const response = await getPartners();
        setPartners(response.partners);
        setFilteredPartners(response.partners);

        // Extract unique cities
        const uniqueCities = Array.from(
          new Set(response.partners.map((p) => p.place).filter(Boolean))
        );
        setCities(uniqueCities.sort());
      } catch (error) {
        console.error("Failed to fetch partners:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartners();
  }, []);

  // Filter partners based on search and city
  useEffect(() => {
    let filtered = partners;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (partner) =>
          partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          partner.place?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by city
    if (selectedCity !== "all") {
      filtered = filtered.filter((partner) => partner.place === selectedCity);
    }

    setFilteredPartners(filtered);
  }, [searchQuery, selectedCity, partners]);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(getMessages(newLocale));
    localStorage.setItem("dinver-locale", newLocale);
  };

  return (
    <main className="min-h-screen bg-white">
      <Header
        messages={messages}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />

      {/* Hero Section */}
      <div className="pt-24 pb-12 sm:pt-32 sm:pb-16 bg-linear-to-br from-dinver-green to-dinver-green-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            {locale === "hr" ? "Natrag na početnu" : "Back to home"}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {locale === "hr"
                ? "Naši Partner Restorani"
                : "Our Partner Restaurants"}
            </h1>
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
              {locale === "hr"
                ? "Otkrijte vrhunske restorane koji su dio Dinver zajednice"
                : "Discover top restaurants that are part of the Dinver community"}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-gray-50 border-b border-gray-200 sticky top-16 lg:top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder={
                  locale === "hr"
                    ? "Pretraži restorane..."
                    : "Search restaurants..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dinver-green focus:border-transparent"
              />
            </div>

            {/* City Filter */}
            <div className="relative sm:w-48">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={18}
              />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dinver-green focus:border-transparent appearance-none"
              >
                <option value="all">
                  {locale === "hr" ? "Svi gradovi" : "All cities"}
                </option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={18}
              />
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600">
            {filteredPartners.length}{" "}
            {locale === "hr" ? "restorana" : "restaurants"}
            {searchQuery || selectedCity !== "all"
              ? ` ${locale === "hr" ? "pronađeno" : "found"}`
              : ""}
          </div>
        </div>
      </div>

      {/* Partners Grid */}
      <div className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-gray-100 rounded-2xl h-80 animate-pulse"
                />
              ))}
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                {locale === "hr" ? "Nema rezultata" : "No results found"}
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredPartners.map((partner, index) => (
                <Link key={partner.id} href={`/restoran/${partner.slug}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 h-full"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-linear-to-br from-dinver-green/10 to-dinver-green/5 overflow-hidden">
                      {partner.thumbnailUrl ? (
                        <Image
                          src={partner.thumbnailUrl}
                          alt={partner.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl font-bold text-dinver-green/20">
                            {partner.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-dinver-green transition-colors">
                        {partner.name}
                      </h3>

                      {/* Location */}
                      <div className="flex items-center gap-2 text-gray-600 mb-3">
                        <MapPin size={16} className="shrink-0" />
                        <span className="text-sm">
                          {partner.address && partner.place
                            ? `${partner.address}, ${partner.place}`
                            : partner.place ||
                              partner.address ||
                              "Location not available"}
                        </span>
                      </div>

                      {/* Rating */}
                      {(partner.dinverRating || partner.rating) && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                            <Star
                              size={14}
                              className="text-amber-500 fill-amber-500"
                            />
                            <span className="text-sm font-semibold text-gray-900">
                              {partner.dinverRating || partner.rating}
                            </span>
                          </div>
                          {partner.dinverReviewsCount && (
                            <span className="text-xs text-gray-500">
                              ({partner.dinverReviewsCount}{" "}
                              {locale === "hr" ? "recenzija" : "reviews"})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Food Types */}
                      {partner.foodTypes && partner.foodTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {partner.foodTypes.slice(0, 3).map((type) => (
                            <span
                              key={type}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        {partner.phone && (
                          <span
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = `tel:${partner.phone}`;
                            }}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-dinver-green transition-colors cursor-pointer"
                          >
                            <Phone size={14} />
                          </span>
                        )}
                        <span className="flex-1" />
                        <span className="text-sm font-semibold text-dinver-green group-hover:text-dinver-green-dark transition-colors">
                          {locale === "hr" ? "Saznaj više" : "Learn more"} →
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <Footer messages={messages} />
    </main>
  );
}

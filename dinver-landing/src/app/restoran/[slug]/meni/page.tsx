"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Utensils,
  Wine,
} from "lucide-react";
import { Locale, getMessages, defaultLocale } from "@/lib/i18n";
import Header from "@/components/layout/Header";
import {
  getPartners,
  getMenuCategories,
  getMenuItems,
  getDrinkCategories,
  getDrinkItems,
  MenuCategory,
  MenuItem,
  DrinkCategory,
  DrinkItem,
} from "@/lib/api";

export default function MenuPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(getMessages(defaultLocale));
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [drinkCategories, setDrinkCategories] = useState<DrinkCategory[]>([]);
  const [drinkItems, setDrinkItems] = useState<DrinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI States
  const [activeTab, setActiveTab] = useState<"food" | "drinks">("food");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");

  const categoriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLocale = localStorage.getItem("dinver-locale") as Locale | null;
    if (savedLocale && (savedLocale === "en" || savedLocale === "hr")) {
      setLocale(savedLocale);
      setMessages(getMessages(savedLocale));
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      setIsLoading(true);

      try {
        const partnersResponse = await getPartners();
        const foundPartner = partnersResponse.partners.find(
          (p) => p.slug === slug
        );

        if (!foundPartner) {
          setIsLoading(false);
          return;
        }

        setRestaurantName(foundPartner.name);
        const restaurantId = foundPartner.id;

        const [
          menuCategoriesData,
          menuItemsData,
          drinkCategoriesData,
          drinkItemsData,
        ] = await Promise.all([
          getMenuCategories(restaurantId).catch(() => []),
          getMenuItems(restaurantId).catch(() => []),
          getDrinkCategories(restaurantId).catch(() => []),
          getDrinkItems(restaurantId).catch(() => []),
        ]);

        setMenuCategories(menuCategoriesData);
        setMenuItems(menuItemsData);
        setDrinkCategories(drinkCategoriesData);
        setDrinkItems(drinkItemsData);

        if (menuCategoriesData.length > 0) {
          setSelectedCategory(menuCategoriesData[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch menu data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(getMessages(newLocale));
    localStorage.setItem("dinver-locale", newLocale);
  };

  // Filter menu items by category and search
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory =
      !selectedCategory || item.categoryId === selectedCategory;
    const itemName =
      item.translations?.find((t) => t.language === locale)?.name || item.name;
    const matchesSearch =
      !menuSearchQuery ||
      itemName.toLowerCase().includes(menuSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.isActive;
  });

  const filteredDrinkItems = drinkItems.filter((item) => {
    const matchesCategory =
      !selectedCategory || item.categoryId === selectedCategory;
    const itemName =
      item.translations?.find((t) => t.language === locale)?.name || item.name;
    const matchesSearch =
      !menuSearchQuery ||
      itemName.toLowerCase().includes(menuSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.isActive;
  });

  const handleTabChange = (tab: "food" | "drinks") => {
    setActiveTab(tab);
    setMenuSearchQuery("");
    if (tab === "food" && menuCategories.length > 0) {
      setSelectedCategory(menuCategories[0].id);
    } else if (tab === "drinks" && drinkCategories.length > 0) {
      setSelectedCategory(drinkCategories[0].id);
    }
  };

  const currentCategories = activeTab === "food" ? menuCategories : drinkCategories;
  const currentItems = activeTab === "food" ? filteredMenuItems : filteredDrinkItems;

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    // Initial delay to ensure fonts/layout settled
    setTimeout(updateHeaderHeight, 100);

    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, [
    restaurantName,
    activeTab,
    selectedCategory,
    menuCategories,
    drinkCategories,
  ]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <Header
          messages={messages}
          locale={locale}
          onLocaleChange={handleLocaleChange}
        />
        <div className="pt-24 pb-16">
          <div className="max-w-3xl mx-auto px-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-12 bg-gray-200 rounded mb-4" />
              <div className="h-12 bg-gray-200 rounded mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
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

      {/* Sticky Header with Tabs and Categories */}
      <div 
        ref={headerRef}
        className="fixed top-16 lg:top-20 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm"
      >
        {/* Restaurant name and back button */}
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/restoran/${slug}`}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
          >
            <ArrowLeft size={18} className="text-gray-700" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-semibold text-gray-900 truncate">
              {locale === "hr" ? "Meni" : "Menu"}
            </h1>
            <p className="text-sm text-gray-500 truncate">{restaurantName}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange("food")}
              className={`flex-1 py-3 text-center font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "food"
                  ? "text-dinver-green border-b-2 border-dinver-green"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Utensils size={18} />
              {locale === "hr" ? "Hrana" : "Food"}
            </button>
            <button
              onClick={() => handleTabChange("drinks")}
              className={`flex-1 py-3 text-center font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "drinks"
                  ? "text-dinver-green border-b-2 border-dinver-green"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Wine size={18} />
              {locale === "hr" ? "Pića" : "Drinks"}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder={
                locale === "hr"
                  ? "Pretraži stavke menija..."
                  : "Search menu items..."
              }
              value={menuSearchQuery}
              onChange={(e) => setMenuSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-dinver-green"
            />
          </div>
        </div>

        {/* Categories */}
        <div
          ref={categoriesRef}
          className="overflow-x-auto no-scrollbar"
        >
          <div className="max-w-3xl mx-auto px-4 pb-3">
            <div className="flex gap-2">
              {currentCategories.map((cat) => {
                const catName =
                  cat.translations?.find((t) => t.language === locale)?.name ||
                  cat.name;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                      selectedCategory === cat.id
                        ? "bg-dinver-green text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {catName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items - with padding for sticky header */}
      <div 
        style={{ paddingTop: headerHeight + 84 }} // 84px is approx top-16 (64px) + buffer
        className="pb-8 transition-all duration-200"
      >
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {currentItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {locale === "hr"
                    ? "Nema stavki menija"
                    : "No menu items available"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {currentItems.map((item) => {
                  const itemName =
                    item.translations?.find((t) => t.language === locale)
                      ?.name || item.name;
                  const itemDesc =
                    item.translations?.find((t) => t.language === locale)
                      ?.description || item.description;
                  const imageUrl =
                    "imageUrls" in item && item.imageUrls?.medium
                      ? item.imageUrls.medium
                      : item.imageUrl;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-4 p-4"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900">
                          {itemName}
                        </h3>
                        {itemDesc && (
                          <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                            {itemDesc}
                          </p>
                        )}
                        <p className="text-dinver-green font-semibold mt-2">
                          {typeof item.price === "number"
                            ? `${item.price.toFixed(2)} €`
                            : `${item.price} €`}
                        </p>
                      </div>
                      {imageUrl && (
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
                          <Image
                            src={imageUrl}
                            alt={itemName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

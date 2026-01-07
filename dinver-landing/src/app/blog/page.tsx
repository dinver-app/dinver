"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Locale, getMessages, defaultLocale } from "@/lib/i18n";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BlogGrid from "@/components/blog/BlogGrid";
import { getBlogs, BlogPost } from "@/lib/blog-api";
import { Loader2 } from "lucide-react";

export default function BlogPage() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(getMessages(defaultLocale));
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const savedLocale = localStorage.getItem("dinver-locale") as Locale | null;
    if (savedLocale && (savedLocale === "en" || savedLocale === "hr")) {
      setLocale(savedLocale);
      setMessages(getMessages(savedLocale));
    }
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(getMessages(newLocale));
    localStorage.setItem("dinver-locale", newLocale);
    // Reload blogs for new language
    setPage(1);
    setPosts([]);
    setIsLoading(true);
  };

  // Map locale to backend language format
  const getLanguage = (loc: Locale): "hr-HR" | "en-US" => {
    return loc === "hr" ? "hr-HR" : "en-US";
  };

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await getBlogs({
          page: 1,
          limit: 9,
          language: getLanguage(locale),
        });
        setPosts(response.blogs);
        setHasMore(response.pagination.currentPage < response.pagination.pages);
        setPage(1);
      } catch (error) {
        console.error("Failed to fetch blogs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogs();
  }, [locale]);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await getBlogs({
        page: nextPage,
        limit: 9,
        language: getLanguage(locale),
      });
      setPosts((prev) => [...prev, ...response.blogs]);
      setHasMore(response.pagination.currentPage < response.pagination.pages);
      setPage(nextPage);
    } catch (error) {
      console.error("Failed to load more blogs:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <Header
        messages={messages}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-dinver-green/5 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              {locale === "hr" ? "Blog" : "Blog"}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
              {locale === "hr"
                ? "Otkrijte savjete o hrani, restoranske preporuke i kulinarsku inspiraciju iz svijeta Dinvera."
                : "Discover food tips, restaurant recommendations, and culinary inspiration from the world of Dinver."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Blog Grid Section */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-dinver-green animate-spin" />
            </div>
          ) : (
            <>
              <BlogGrid posts={posts} locale={locale} />

              {/* Load More Button */}
              {hasMore && posts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center mt-12"
                >
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-dinver-green text-white font-semibold rounded-xl hover:bg-dinver-green/90 transition-colors disabled:opacity-70"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {locale === "hr" ? "Učitavanje..." : "Loading..."}
                      </>
                    ) : locale === "hr" ? (
                      "Učitaj više"
                    ) : (
                      "Load more"
                    )}
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer messages={messages} locale={locale} />
    </main>
  );
}

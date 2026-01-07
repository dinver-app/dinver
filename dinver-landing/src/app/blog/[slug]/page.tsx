"use client";

import { useState, useEffect, use } from "react";
import { Locale, getMessages, defaultLocale } from "@/lib/i18n";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BlogContent from "@/components/blog/BlogContent";
import { getBlogBySlug, getBlogSessionId, BlogPostDetail } from "@/lib/blog-api";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = use(params);
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(getMessages(defaultLocale));
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  };

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const sessionId = getBlogSessionId();
        const blogPost = await getBlogBySlug(slug, sessionId);
        setPost(blogPost);
      } catch (err) {
        console.error("Failed to fetch blog:", err);
        setError(
          locale === "hr"
            ? "Članak nije pronađen"
            : "Article not found"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlog();
  }, [slug, locale]);

  return (
    <main className="min-h-screen bg-white">
      <Header
        messages={messages}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />

      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-dinver-green animate-spin" />
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{error}</h1>
              <p className="text-gray-600 mb-8">
                {locale === "hr"
                  ? "Traženi članak ne postoji ili je uklonjen."
                  : "The requested article does not exist or has been removed."}
              </p>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 px-6 py-3 bg-dinver-green text-white font-semibold rounded-xl hover:bg-dinver-green/90 transition-colors"
              >
                {locale === "hr" ? "Natrag na blog" : "Back to blog"}
              </Link>
            </motion.div>
          ) : post ? (
            <BlogContent post={post} locale={locale} />
          ) : null}
        </div>
      </section>

      <Footer messages={messages} locale={locale} />
    </main>
  );
}

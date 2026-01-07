"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Eye, Calendar, ChevronLeft, User, Share2 } from "lucide-react";
import { BlogPostDetail, formatDate, formatReadingTime, trackBlogView, getBlogSessionId } from "@/lib/blog-api";
import BlogReactions from "./BlogReactions";

interface BlogContentProps {
  post: BlogPostDetail;
  locale: "en" | "hr";
}

export default function BlogContent({ post, locale }: BlogContentProps) {
  useEffect(() => {
    // Track view on mount
    trackBlogView(post.slug).catch(console.error);
  }, [post.slug]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = post.title;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (error) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      // Could add a toast notification here
    }
  };

  return (
    <article className="max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-dinver-green hover:text-dinver-green/80 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          {locale === "hr" ? "Natrag na blog" : "Back to blog"}
        </Link>
      </motion.nav>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        {/* Category */}
        {post.category && (
          <span className="inline-block px-3 py-1 bg-dinver-green/10 text-dinver-green text-sm font-semibold rounded-full mb-4">
            {post.category}
          </span>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-gray-600">
          {/* Author */}
          <div className="flex items-center gap-2">
            {post.author.profileImage ? (
              <Image
                src={post.author.profileImage}
                alt={post.author.name}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-dinver-green/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-dinver-green" />
              </div>
            )}
            <span className="font-medium">{post.author.name}</span>
          </div>

          <span className="text-gray-300">•</span>

          {/* Date */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(post.publishedAt, locale)}</span>
          </div>

          <span className="text-gray-300">•</span>

          {/* Reading time */}
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{formatReadingTime(post.readingTimeMinutes, locale)}</span>
          </div>

          <span className="text-gray-300">•</span>

          {/* Views */}
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            <span>
              {post.viewCount.toLocaleString()}{" "}
              {locale === "hr" ? "pregleda" : "views"}
            </span>
          </div>
        </div>
      </motion.header>

      {/* Featured Image */}
      {post.featuredImage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative aspect-video w-full rounded-2xl overflow-hidden mb-10 bg-gray-100"
        >
          <Image
            src={post.featuredImage}
            alt={post.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 900px"
          />
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="prose prose-lg prose-gray max-w-none
          prose-headings:font-bold prose-headings:text-gray-900
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-gray-700 prose-p:leading-relaxed
          prose-a:text-dinver-green prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-900
          prose-ul:my-4 prose-ol:my-4
          prose-li:text-gray-700
          prose-img:rounded-xl prose-img:shadow-md
          prose-blockquote:border-l-dinver-green prose-blockquote:bg-gray-50 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-lg
          prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-dinver-green
          prose-pre:bg-gray-900 prose-pre:text-gray-100"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-gray-200"
        >
          <span className="text-gray-600 font-medium mr-2">
            {locale === "hr" ? "Oznake:" : "Tags:"}
          </span>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-gray-200 transition-colors"
            >
              {tag}
            </span>
          ))}
        </motion.div>
      )}

      {/* Share Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center mt-8"
      >
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          <Share2 className="w-5 h-5" />
          {locale === "hr" ? "Podijeli članak" : "Share article"}
        </button>
      </motion.div>

      {/* Reactions */}
      <BlogReactions
        slug={post.slug}
        initialLikes={post.likesCount}
        initialDislikes={post.dislikesCount}
        initialUserReaction={post.userReaction}
        locale={locale}
      />
    </article>
  );
}

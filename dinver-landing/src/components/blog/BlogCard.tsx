"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Eye, User } from "lucide-react";
import { BlogPost, formatDate, formatReadingTime } from "@/lib/blog-api";

interface BlogCardProps {
  post: BlogPost;
  locale: "en" | "hr";
  index?: number;
}

export default function BlogCard({ post, locale, index = 0 }: BlogCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group h-full"
    >
      <Link href={`/blog/${post.slug}`} className="block h-full">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col border border-gray-100">
          {/* Featured Image */}
          <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-gray-100">
            {post.featuredImage ? (
              <Image
                src={post.featuredImage}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-dinver-green/10 to-dinver-green/5 flex items-center justify-center">
                <span className="text-dinver-green/30 text-6xl font-bold">D</span>
              </div>
            )}
            {/* Category Badge */}
            {post.category && (
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-dinver-green text-xs font-semibold rounded-full">
                  {post.category}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6 flex flex-col flex-grow">
            {/* Author & Date */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                {post.author.profileImage ? (
                  <Image
                    src={post.author.profileImage}
                    alt={post.author.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 bg-dinver-green/10 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-dinver-green" />
                  </div>
                )}
                <span className="text-sm text-gray-600">{post.author.name}</span>
              </div>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">
                {formatDate(post.publishedAt, locale)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 group-hover:text-dinver-green transition-colors line-clamp-2">
              {post.title}
            </h3>

            {/* Excerpt */}
            <p className="text-gray-600 text-sm sm:text-base line-clamp-3 flex-grow">
              {post.excerpt}
            </p>

            {/* Footer Meta */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{formatReadingTime(post.readingTimeMinutes, locale)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span>{post.viewCount.toLocaleString()}</span>
                </div>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="hidden sm:flex gap-2">
                  {post.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

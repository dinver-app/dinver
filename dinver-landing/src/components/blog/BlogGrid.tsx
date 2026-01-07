"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import BlogCard from "./BlogCard";
import { BlogPost } from "@/lib/blog-api";

interface BlogGridProps {
  posts: BlogPost[];
  locale: "en" | "hr";
  emptyMessage?: string;
}

export default function BlogGrid({ posts, locale, emptyMessage }: BlogGridProps) {
  if (posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {locale === "hr" ? "Nema članaka" : "No articles"}
        </h3>
        <p className="text-gray-500 text-center max-w-md">
          {emptyMessage ||
            (locale === "hr"
              ? "Trenutno nema objavljenih članaka. Provjerite ponovno uskoro!"
              : "There are no published articles at the moment. Check back soon!")}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {posts.map((post, index) => (
        <BlogCard key={post.id} post={post} locale={locale} index={index} />
      ))}
    </div>
  );
}

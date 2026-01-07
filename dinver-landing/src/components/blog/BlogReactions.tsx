"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { reactToBlog, getBlogSessionId } from "@/lib/blog-api";

interface BlogReactionsProps {
  slug: string;
  initialLikes: number;
  initialDislikes: number;
  initialUserReaction: "like" | "dislike" | null;
  locale: "en" | "hr";
}

export default function BlogReactions({
  slug,
  initialLikes,
  initialDislikes,
  initialUserReaction,
  locale,
}: BlogReactionsProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(
    initialUserReaction
  );
  const [isLoading, setIsLoading] = useState(false);
  const [animatingButton, setAnimatingButton] = useState<"like" | "dislike" | null>(null);

  const handleReaction = async (reaction: "like" | "dislike") => {
    if (isLoading) return;

    setIsLoading(true);
    setAnimatingButton(reaction);

    try {
      const sessionId = getBlogSessionId();
      const newReaction = userReaction === reaction ? null : reaction;

      const result = await reactToBlog(slug, newReaction, sessionId);

      setLikes(result.likesCount);
      setDislikes(result.dislikesCount);
      setUserReaction(result.userReaction);
    } catch (error) {
      console.error("Failed to react:", error);
    } finally {
      setIsLoading(false);
      setTimeout(() => setAnimatingButton(null), 300);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 sm:p-8 mt-12">
      <h3 className="text-lg font-semibold text-gray-900 text-center mb-6">
        {locale === "hr"
          ? "Je li vam se svidio ovaj članak?"
          : "Did you like this article?"}
      </h3>

      <div className="flex items-center justify-center gap-6">
        {/* Like Button */}
        <motion.button
          onClick={() => handleReaction("like")}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-200
            ${
              userReaction === "like"
                ? "bg-dinver-green text-white shadow-lg shadow-dinver-green/30"
                : "bg-white text-gray-700 hover:bg-dinver-green/10 hover:text-dinver-green border border-gray-200"
            }
            ${isLoading ? "opacity-70 cursor-not-allowed" : ""}
          `}
        >
          <motion.div
            animate={
              animatingButton === "like"
                ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }
                : {}
            }
            transition={{ duration: 0.3 }}
          >
            <ThumbsUp
              className={`w-5 h-5 ${
                userReaction === "like" ? "fill-current" : ""
              }`}
            />
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.span
              key={likes}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="min-w-[1.5rem]"
            >
              {likes}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {/* Dislike Button */}
        <motion.button
          onClick={() => handleReaction("dislike")}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-200
            ${
              userReaction === "dislike"
                ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                : "bg-white text-gray-700 hover:bg-red-50 hover:text-red-500 border border-gray-200"
            }
            ${isLoading ? "opacity-70 cursor-not-allowed" : ""}
          `}
        >
          <motion.div
            animate={
              animatingButton === "dislike"
                ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }
                : {}
            }
            transition={{ duration: 0.3 }}
          >
            <ThumbsDown
              className={`w-5 h-5 ${
                userReaction === "dislike" ? "fill-current" : ""
              }`}
            />
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.span
              key={dislikes}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="min-w-[1.5rem]"
            >
              {dislikes}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      <p className="text-sm text-gray-500 text-center mt-4">
        {locale === "hr"
          ? "Vaše mišljenje nam pomaže poboljšati sadržaj"
          : "Your feedback helps us improve our content"}
      </p>
    </div>
  );
}

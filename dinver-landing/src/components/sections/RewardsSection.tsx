"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Trophy,
  Gift,
  Star,
  Zap,
  Crown,
  Timer,
  Receipt,
  Share2,
  UserPlus,
} from "lucide-react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { Messages } from "@/lib/i18n";

interface RewardsSectionProps {
  messages: Messages;
  locale: "en" | "hr";
}

export default function RewardsSection({ locale }: RewardsSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  // Real points from backend
  const pointsActions = [
    {
      icon: Receipt,

      action: locale === "hr" ? "Uslikaj račun" : "Take a photo of the receipt",
      points: "1/10€",
      description:
        locale === "hr" ? "Potrošenih 10€ = 1 bod" : "Spent €10 = 1 point",
    },
    {
      icon: Star,
      action: locale === "hr" ? "Objavi doživljaj" : "Post an experience",
      points: "+3",
      description:
        locale === "hr" ? "Sa slikama i ocjenom" : "With photos and rating",
    },
    {
      icon: UserPlus,
      action: locale === "hr" ? "Pozovi prijatelja" : "Invite a friend",
      points: "+2",
      description:
        locale === "hr"
          ? "+2 boda kada se prijatelj verificira"
          : "+2 points when your friend is verified",
    },
    {
      icon: Share2,
      action:
        locale === "hr" ? "Prvi račun prijatelja" : "Friend's first receipt",
      points: "+2",
      description:
        locale === "hr" ? "Bonus bodovi za tebe" : "Bonus points for you",
    },
  ];

  // Mock leaderboard data (blurred)
  const leaderboardUsers = [
    { rank: 1, name: "Ana M.", points: 247, avatar: "A" },
    { rank: 2, name: "Marko K.", points: 212, avatar: "M" },
    { rank: 3, name: "Ivan P.", points: 189, avatar: "I" },
    { rank: 4, name: "Petra S.", points: 165, avatar: "P" },
    { rank: 5, name: "Luka T.", points: 142, avatar: "L" },
    { rank: 6, name: "Nina B.", points: 128, avatar: "N" },
  ];

  const mysteryBoxItems = [
    locale === "hr" ? "Vaučeri za restorane" : "Restaurant vouchers",
    locale === "hr" ? "Dinver merch" : "Dinver merch",
    locale === "hr" ? "Ekskluzivne nagrade" : "Exclusive rewards",
  ];

  return (
    <section
      ref={containerRef}
      className="py-16 sm:py-24 lg:py-32 bg-linear-to-b from-gray-50 to-white overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-100 text-amber-700 rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-6"
          >
            <Trophy size={14} className="sm:w-4 sm:h-4" />
            {locale === "hr" ? "Nagrade & bodovi" : "Rewards & points"}
          </motion.span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
            {locale === "hr"
              ? "Osvajaj bodove za svaki posjet"
              : "Earn points for every visit"}
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-gray-600">
            {locale === "hr"
              ? "Sakupljaj bodove, natječi se na ljestvici i osvoji Dinver Mystery Box!"
              : "Collect points, compete on the leaderboard and win Dinver Mystery Box!"}
          </p>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          {/* Left: Points system */}
          <AnimatedSection direction="left">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl border border-gray-100">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                <Zap className="text-amber-500" size={20} />
                {locale === "hr"
                  ? "Kako osvojiti bodove"
                  : "How to earn points"}
              </h3>

              <div className="space-y-3 sm:space-y-4">
                {pointsActions.map((action, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-dinver-green/10 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                        <action.icon className="text-dinver-green" size={20} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-gray-700 block text-sm sm:text-base truncate">
                          {action.action}
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-500">
                          {action.description}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-dinver-green bg-dinver-green/10 px-2 sm:px-3 py-1 rounded-lg shrink-0 ml-2">
                      {action.points}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Cycle info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6 }}
                className="mt-4 sm:mt-6 p-3 sm:p-4 bg-dinver-green/5 rounded-xl sm:rounded-2xl border border-dinver-green/10"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <Timer className="text-dinver-green shrink-0" size={20} />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">
                      {locale === "hr"
                        ? "Ciklus traje 2 tjedna"
                        : "2-week cycles"}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {locale === "hr"
                        ? "Najbolji i jedan nasumično odabran sudionik osvajaju nagrade!"
                        : "The best and one random participant win prizes!"}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>

          {/* Right: Leaderboard & Mystery Box */}
          <AnimatedSection direction="right" className="space-y-6 sm:space-y-8">
            {/* Blurred Leaderboard */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-gray-100 overflow-hidden">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                <Crown className="text-amber-500" size={20} />
                {locale === "hr" ? "Rang Lista" : "Leaderboard"}
              </h3>

              <div className="space-y-2 relative">
                {leaderboardUsers.map((user, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.3 + index * 0.08 }}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl ${
                      user.rank <= 3 ? "bg-linear-to-r" : "bg-gray-50"
                    } ${
                      user.rank === 1
                        ? "from-amber-50 to-yellow-50 border border-amber-200"
                        : ""
                    }
                    ${
                      user.rank === 2
                        ? "from-gray-100 to-gray-50 border border-gray-200"
                        : ""
                    }
                    ${
                      user.rank === 3
                        ? "from-orange-50 to-amber-50 border border-orange-200"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                          user.rank === 1
                            ? "bg-amber-400 text-white"
                            : user.rank === 2
                            ? "bg-gray-400 text-white"
                            : user.rank === 3
                            ? "bg-orange-400 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {user.rank}
                      </span>
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-dinver-green/10 rounded-full flex items-center justify-center text-xs font-bold text-dinver-green">
                        {user.avatar}
                      </div>
                      <span
                        className={`font-medium text-sm sm:text-base ${
                          index >= 2 ? "blur-[3px]" : ""
                        }`}
                      >
                        {user.name}
                      </span>
                    </div>
                    <span
                      className={`font-bold text-dinver-green text-sm sm:text-base ${
                        index >= 2 ? "blur-[3px]" : ""
                      }`}
                    >
                      {user.points} {locale === "hr" ? "bod" : "pts"}
                    </span>
                  </motion.div>
                ))}

                {/* Blur overlay for FOMO */}
                <div className="absolute inset-x-0 bottom-0 h-16 sm:h-20 bg-linear-to-t from-white via-white/80 to-transparent pointer-events-none" />
              </div>

              <p className="text-center text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4 relative z-10">
                {locale === "hr"
                  ? "Preuzmi app da vidiš potpunu ljestvicu"
                  : "Download the app to see full leaderboard"}
              </p>
            </div>

            {/* Mystery Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.8 }}
              className="relative bg-linear-to-br from-dinver-dark to-dinver-green-dark rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-24 sm:h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <div className="flex items-start gap-3 sm:gap-4">
                  <motion.div
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                    className="w-12 h-12 sm:w-16 sm:h-16 bg-dinver-cream rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shrink-0"
                  >
                    <Gift className="text-dinver-dark" size={24} />
                  </motion.div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold mb-1">
                      Mystery Box
                    </h3>
                    <p className="text-white/70 text-xs sm:text-sm">
                      {locale === "hr"
                        ? "Iznenađenje za pobjednike svakog ciklusa"
                        : "Surprise for cycle winners"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 flex flex-wrap gap-1.5 sm:gap-2">
                  {mysteryBoxItems.map((item, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={isInView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ delay: 1 + i * 0.1 }}
                      className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/10 rounded-full text-xs sm:text-sm"
                    >
                      {item}
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

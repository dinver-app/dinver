import { z } from "zod";

// Authentication schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address."),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters long."),
});

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must have at least 2 characters")
    .max(50, "First name is too long"),
  lastName: z
    .string()
    .min(2, "Last name must have at least 2 characters")
    .max(50, "Last name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long.")
    .max(100, "Password is too long"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^\+[0-9]{1,3}[0-9]{6,14}$/,
      "Phone must be in format: +[country code][number]"
    ),
});

export const userSchema = z.object({
  id: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  profileImage: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  location: z
    .object({
      street: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
    })
    .optional(),
  stats: z
    .object({
      points: z.number().optional(),
      level: z.number().optional(),
      reviewCount: z.number().optional(),
      favoriteCount: z.number().optional(),
      completedReservationsCount: z.number().optional(),
    })
    .optional(),
  role: z.string().optional(),
  language: z.string().optional(),
  banned: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type User = z.infer<typeof userSchema>;

export function validateFullName(
  fullName: string
): { firstName: string; lastName: string } | null {
  if (!fullName || typeof fullName !== "string") return null;

  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");

  if (!firstName || !lastName) return null;
  return { firstName, lastName };
}

// Search schemas
export const searchInputSchema = z
  .string()
  .max(50, "Search is too long")
  .refine((text) => !/^\s+$/.test(text), "Search cannot contain only spaces");

export const searchParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  search: searchInputSchema.optional(),
});

// Restaurant schemas
export const openingPeriodSchema = z.object({
  open: z.object({
    day: z.number(),
    time: z.string(),
  }),
  close: z
    .object({
      day: z.number(),
      time: z.string(),
    })
    .optional(),
});

export const openingHoursSchema = z.object({
  periods: z.array(openingPeriodSchema).optional(),
  open_now: z.boolean().optional(),
  weekday_text: z.array(z.string()).optional(),
});

export const restaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  rating: z.number().nullable(),
  userRatingsTotal: z.number().nullable(),
  priceLevel: z.number().nullable(),
  openingHours: openingHoursSchema.optional(),
  iconUrl: z.string().nullable(),
  slug: z.string().optional(),
  isClaimed: z.boolean().optional(),
  email: z.string().nullable().optional(),
  isOpen: z
    .union([z.boolean(), z.string(), z.literal("undefined")])
    .nullable()
    .optional(),
  reviewRating: z.number().nullable().optional(),
  distance: z.number().optional(),
  isFavorite: z.boolean().optional(),
});

export const restaurantsResponseSchema = z.object({
  totalRestaurants: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
  restaurants: z.array(restaurantSchema),
  hasSampleLimit: z.boolean().optional(),
  fixedSampleSize: z.number().optional(),
  maxRecords: z.number().optional(),
});

export type Restaurant = z.infer<typeof restaurantSchema>;
export type SearchParams = z.infer<typeof searchParamsSchema>;

// Location schemas
export const locationParamsSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type LocationParams = z.infer<typeof locationParamsSchema>;
export type RestaurantsResponse = z.infer<typeof restaurantsResponseSchema>;

// Favorite schemas
export const favoriteCheckResponseSchema = z.object({
  isFavorite: z.boolean(),
});

export const favoriteRestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  rating: z.number(),
  priceLevel: z.number().nullable().optional(),
  address: z.string(),
  iconUrl: z.string().optional(),
});

export const favoriteMessageResponseSchema = z.object({
  message: z.string(),
});

export const addFavoriteInputSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
});

export type FavoriteCheckResponse = z.infer<typeof favoriteCheckResponseSchema>;
export type FavoriteRestaurant = z.infer<typeof favoriteRestaurantSchema>;
export type FavoriteMessageResponse = z.infer<
  typeof favoriteMessageResponseSchema
>;
export type AddFavoriteInput = z.infer<typeof addFavoriteInputSchema>;

// User settings schemas
export const userSettingsNotificationSchema = z.object({
  push: z.boolean().optional(),
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
});

export const userVerificationSchema = z.object({
  isEmailVerified: z.boolean().optional(),
  isPhoneVerified: z.boolean().optional(),
});

export const userSettingsSchema = z.object({
  language: z.string().optional(),
  notifications: userSettingsNotificationSchema.optional(),
  verification: userVerificationSchema.optional(),
});

export const userSettingsResponseSchema = z.object({
  settings: userSettingsSchema,
});

export const updateUserSettingsSchema = z.object({
  settings: z.object({
    language: z.string().optional(),
    notifications: userSettingsNotificationSchema.optional(),
  }),
});

export type UserSettingsNotification = z.infer<
  typeof userSettingsNotificationSchema
>;
export type UserVerification = z.infer<typeof userVerificationSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type UserSettingsResponse = z.infer<typeof userSettingsResponseSchema>;
export type UpdateUserSettings = z.infer<typeof updateUserSettingsSchema>;

// User profile schemas
export const userLocationSchema = z.object({
  street: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
});

export const userStatsSchema = z.object({
  points: z.number(),
  level: z.number(),
  reviewCount: z.number(),
  favoriteCount: z.number(),
  completedReservationsCount: z.number(),
});

export const userProfileSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  profileImage: z.string().nullable().optional(),
  bio: z.string().nullable(),
  location: userLocationSchema.optional(),
  stats: userStatsSchema.optional(),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  birthDate: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  streetAddress: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

export type UserLocation = z.infer<typeof userLocationSchema>;
export type UserStats = z.infer<typeof userStatsSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;

// Profile image schemas
export const profileImageResponseSchema = z.object({
  message: z.string(),
  imageUrl: z.string().url("Invalid image URL"),
});

export const deleteProfileImageResponseSchema = z.object({
  message: z.string(),
});

export type ProfileImageResponse = z.infer<typeof profileImageResponseSchema>;
export type DeleteProfileImageResponse = z.infer<
  typeof deleteProfileImageResponseSchema
>;

// Verification and security schemas
export const verificationStatusSchema = z.object({
  isEmailVerified: z.boolean(),
  isPhoneVerified: z.boolean(),
});

export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters long"),
});

export const changePasswordResponseSchema = z.object({
  message: z.string(),
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
export type ChangePasswordResponse = z.infer<
  typeof changePasswordResponseSchema
>;

// Search history schemas
export const searchHistoryItemSchema = z.object({
  searchTerm: z.string(),
  timestamp: z.number(),
});

export const searchHistoryRequestSchema = z.object({
  searchTerm: z
    .string()
    .min(1, "Search term is required")
    .max(50, "Search term is too long"),
});

export const searchHistoryResponseSchema = z.object({
  message: z.string(),
});

export type SearchHistoryItem = z.infer<typeof searchHistoryItemSchema>;
export type SearchHistoryRequest = z.infer<typeof searchHistoryRequestSchema>;
export type SearchHistoryResponse = z.infer<typeof searchHistoryResponseSchema>;

// User stats and summary schemas
export const userPointsSchema = z.object({
  total: z.number(),
  level: z.number(),
  pointsToNextLevel: z.number(),
});

export const userReviewsSchema = z.object({
  total: z.number(),
  averageRating: z.number(),
  lastReviewDate: z.string().nullable(),
});

export const recentFavoriteSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const userFavoritesSchema = z.object({
  total: z.number(),
  recent: z.array(recentFavoriteSchema).optional(),
});

export const userReservationsSchema = z.object({
  completed: z.number(),
  pending: z.number(),
  cancelled: z.number(),
  total: z.number(),
});

export const userStatsDetailsSchema = z.object({
  points: userPointsSchema,
  reviews: userReviewsSchema,
  favorites: userFavoritesSchema,
  reservations: userReservationsSchema,
});

export type UserPointsStats = z.infer<typeof userPointsSchema>;
export type UserReviewsStats = z.infer<typeof userReviewsSchema>;
export type RecentFavorite = z.infer<typeof recentFavoriteSchema>;
export type UserFavoritesStats = z.infer<typeof userFavoritesSchema>;
export type UserReservationsStats = z.infer<typeof userReservationsSchema>;
export type UserStatsDetails = z.infer<typeof userStatsDetailsSchema>;

// Achievement schemas
export const nextLevelInfoSchema = z.object({
  en: z.string(),
  hr: z.string(),
  progress: z.number(),
  threshold: z.number(),
});

export const achievementCategorySchema = z.object({
  totalLevels: z.number(),
  currentLevel: z.number(),
  currentTitle: z.string().nullable(),
  nextLevel: nextLevelInfoSchema,
});

export const achievementsResponseSchema = z.object({
  categorySummary: z.object({
    CITY_HOPPER: achievementCategorySchema,
    ELITE_REVIEWER: achievementCategorySchema,
    FOOD_EXPLORER: achievementCategorySchema,
    WORLD_CUISINE: achievementCategorySchema,
  }),
  totalAchieved: z.number(),
});

export type NextLevelInfo = z.infer<typeof nextLevelInfoSchema>;
export type AchievementCategory = z.infer<typeof achievementCategorySchema>;
export type AchievementsResponse = z.infer<typeof achievementsResponseSchema>;

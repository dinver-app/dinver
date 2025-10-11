export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt?: string;
  banned?: boolean;
}

export interface Sysadmin {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: User;
}

export interface Restaurant {
  id?: string;
  name: string;
  address: string;
  description?: string;
  workingHoursInfo?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  isOpenNow?: boolean;
  openingHours?: any;
  kitchenHours?: any;
  foodTypes?: number[];
  establishmentTypes?: number[];
  establishmentPerks?: number[];
  mealTypes?: number[];
  priceCategoryId?: number;
  iconUrl?: string;
  photoReference?: string;
  vicinity?: string;
  businessStatus?: string;
  geometry?: object;
  iconBackgroundColor?: string;
  iconMaskBaseUri?: string;
  photos?: object[];
  plusCode?: string;
  createdAt?: string;
  updatedAt?: string;
  organizationId?: string;
  isOpen?: string;
  isClaimed?: boolean;
  slug?: string;
  isDirty?: boolean;
  websiteUrl?: string;
  fbUrl?: string;
  igUrl?: string;
  ttUrl?: string;
  phone?: string;
  images?: string[];
  reviewRating?: number;
  email?: string;
  place?: string;
  translations?: {
    language: string;
    name: string;
    description: string;
  }[];
  dietaryTypes?: number[];
  wifiSsid?: string;
  wifiPassword?: string;
  showWifiCredentials?: boolean;
  reservationEnabled?: boolean;
  subdomain?: string;
  virtualTourUrl?: string;
}

export interface FoodType {
  id: number;
  nameEn: string;
  nameHr: string;
  icon: string;
}

export interface EstablishmentType {
  id: number;
  nameEn: string;
  nameHr: string;
  icon: string;
}

export interface EstablishmentPerk {
  id: number;
  nameEn: string;
  nameHr: string;
  icon: string;
}

export interface MealType {
  id: number;
  nameEn: string;
  nameHr: string;
  icon: string;
}

export interface PriceCategory {
  id: number;
  nameEn: string;
  nameHr: string;
  icon: string;
  level: number;
}

export enum Language {
  HR = "hr",
  EN = "en",
}

export interface Translation {
  language: Language;
  name: string;
  description?: string;
}

export interface MenuItemSize {
  id: string;
  sizeId: string;
  price: string;
  isDefault: boolean;
  position: number;
  name: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  restaurantId: string;
  price: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  priceRange?: string | null;
  imageUrl: string | null;
  allergens: string[];
  translations: Translation[];
  position: number;
  isActive?: boolean;
  sizes?: MenuItemSize[] | null;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  restaurantId: string;
  translations: Translation[];
  position: number;
  isActive?: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  restaurantId: string;
  action: string;
  entity: string;
  entityId: string;
  changes: string;
  createdAt: string;
}

export interface Backup {
  restaurantId: string;
  backupDate: string;
  key: string;
}

export interface Review {
  id: string;
  rating: number;
  foodQuality: number;
  service: number;
  atmosphere: number;
  text: string;
  photos: string[];
  userId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  createdAt?: string;
}

export interface RestaurantReviews {
  restaurant: string;
  reviews: Review[];
  totalReviews: number;
}

export interface WorkingHoursTabProps {
  restaurant: Restaurant;
  onUpdate: (updatedRestaurant: Restaurant) => void;
}

export interface CustomWorkingDay {
  id: string;
  name: string;
  date: string;
  times: { open: string; close: string }[];
}

export interface Allergen {
  id: number;
  nameEn: string;
  nameHr: string;
  icon: string;
}

export interface DrinkItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string | null;
  imageUrl?: string;
  translations: Translation[];
  order?: number;
  isActive?: boolean;
}

export interface DrinkCategoryData {
  translations: Translation[];
  restaurantId: string;
  isActive?: boolean;
}

export interface CategoryData {
  restaurantId: string;
  translations: Translation[];
  isActive?: boolean;
}

export interface DietaryType {
  id: number;
  nameEn: string;
  nameHr: string;
  icon: string;
}

export interface BlogUser {
  id: string;
  name: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  authorId: string;
  author?: BlogUser;
  featuredImage?: string;
  status: "draft" | "published" | "archived";
  publishedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  category?: string;
  tags: string[];
  readingTimeMinutes?: number;
  shareCount: number;
  viewCount: number;
  language: string;
  createdAt: string;
  updatedAt: string;
}

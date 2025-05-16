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

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  restaurantId: string;
  price: string;
  imageUrl: string | null;
  allergens: string[];
  translations: Translation[];
  position: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  restaurantId: string;
  translations: Translation[];
  position: number;
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
  valueForMoney: number;
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
}

export interface DrinkCategoryData {
  translations: Translation[];
  restaurantId: string;
}

export interface CategoryData {
  restaurantId: string;
  translations: Translation[];
}

export interface DietaryType {
  id: number;
  nameEn: string;
  nameHr: string;
  icon: string;
}

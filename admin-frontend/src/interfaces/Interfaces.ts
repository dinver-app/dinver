export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt?: string;
  banned?: boolean;
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
  place?: string;
  email?: string;
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
  minPrice?: number | null;
  maxPrice?: number | null;
  priceRange?: string | null;
  imageUrl: string | null;
  allergens: string[];
  translations: Translation[];
  position: number;
  isActive: boolean;
  defaultSizeId?: string | null;
  sizes?:
    | { id: string; price: number; translations: { hr: string; en: string } }[]
    | null;
}

export interface Category {
  id: string;
  name: string;
  restaurantId: string;
  translations: Translation[];
  position: number;
  isActive: boolean;
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
  restaurantName?: string;
  userEmail?: string;
}

export interface Review {
  id: string;
  rating: number;
  text: string;
  images: string[];
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt?: string;
  restaurant?: string;
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
  isActive: boolean;
}

export interface DrinkCategoryData {
  translations: Translation[];
  restaurantId: string;
  isActive: boolean;
}

export interface CategoryData {
  restaurantId: string;
  translations: Translation[];
  isActive: boolean;
}

export interface DietaryType {
  id: number;
  nameEn: string;
  nameHr: string;
  icon: string;
}

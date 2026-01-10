// Dinver Backend API Client

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/landing';
const API_KEY = process.env.NEXT_PUBLIC_LANDING_API_KEY || '';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ param: string; msg: string }>;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'y-api-key': API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

// ==================== WAITLIST ====================

export interface WaitlistUserRequest {
  email: string;
  city: string;
}

export interface WaitlistRestaurantRequest {
  email: string;
  city: string;
  restaurantName: string;
}

export interface WaitlistResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    email: string;
    city: string;
    restaurantName?: string;
    type: 'user' | 'restaurant';
  };
}

export async function addUserToWaitlist(data: WaitlistUserRequest): Promise<WaitlistResponse> {
  return apiRequest<WaitlistResponse>('/waitlist/user', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addRestaurantToWaitlist(data: WaitlistRestaurantRequest): Promise<WaitlistResponse> {
  return apiRequest<WaitlistResponse>('/waitlist/restaurant', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==================== PARTNERS ====================

export interface Partner {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  place: string;
  phone?: string | null;
  thumbnailUrl?: string | null;
  slug: string;
  rating?: number | null;
  dinverRating?: number | string | null; // Can be number, string like "4.30", or null
  dinverReviewsCount?: number;
  virtualTourUrl?: string | null;
  latitude?: number;
  longitude?: number;
  isOpenNow?: boolean;
  foodTypes?: string[];
  isClaimed: boolean;
}

export interface PartnersResponse {
  partners: Partner[];
  total: number;
}

export async function getPartners(): Promise<PartnersResponse> {
  return apiRequest<PartnersResponse>('/partners');
}

// ==================== RESTAURANT DETAILS ====================

export interface TypeItem {
  id: string;
  nameEn: string;
  nameHr: string;
  icon?: string;
}

export interface RestaurantImage {
  url: string;
  imageUrls?: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
  };
}

export interface HoursStatus {
  restaurant?: {
    isOpen: boolean;
    closesAt?: string;
    opensAt?: string;
    closingSoon?: boolean;
    currentShift?: { open: string; close: string };
  };
  today?: {
    isOpen: boolean;
    message?: {
      en: string;
      hr: string;
    };
  };
  kitchen?: {
    isOpen: boolean;
    closesAt?: string;
    opensAt?: string;
    closingSoon?: boolean;
    currentShift?: { open: string; close: string };
  };
}

export interface RestaurantReview {
  id: string;
  rating: number;
  photos?: string[];
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
}

export interface RestaurantRatings {
  overall: number;
  foodQuality: number;
  service: number;
  atmosphere: number;
}

export interface OpeningHoursPeriod {
  open: { day: number; time: string };
  close: { day: number; time: string };
  shifts?: Array<{ open: string; close: string }>;
}

export interface CustomWorkingDay {
  date: string;
  isClosed?: boolean;
  shifts?: Array<{ open: string; close: string }>;
  note?: string;
}

export interface RestaurantDetails extends Omit<Partner, 'description' | 'foodTypes'> {
  userRatingsTotal?: number;
  priceLevel?: string;
  websiteUrl?: string;
  fbUrl?: string;
  igUrl?: string;
  ttUrl?: string;
  email?: string;
  images?: RestaurantImage[];
  openingHours?: {
    periods: OpeningHoursPeriod[];
  };
  kitchenHours?: {
    periods: OpeningHoursPeriod[];
  };
  customWorkingDays?: {
    customWorkingDays: CustomWorkingDay[];
  };
  subdomain?: string;
  reservationEnabled?: boolean;
  priceCategory?: {
    id: string;
    nameEn: string;
    nameHr: string;
    icon?: string;
    level: number;
  };
  description?: {
    en: string;
    hr: string;
  };
  translations?: Array<{
    language: string;
    name: string;
    description?: string;
  }>;
  foodTypes?: TypeItem[];
  establishmentTypes?: TypeItem[];
  establishmentPerks?: TypeItem[];
  mealTypes?: TypeItem[];
  dietaryTypes?: TypeItem[];
  reviews?: RestaurantReview[];
  totalReviews?: number;
  ratings?: RestaurantRatings;
  hoursStatus?: HoursStatus;
}

export async function getRestaurantDetails(
  restaurantId: string,
  includeWifi = false
): Promise<RestaurantDetails> {
  const params = includeWifi ? '?includeWifi=true' : '';
  return apiRequest<RestaurantDetails>(`/details/${restaurantId}${params}`);
}

export async function getRestaurantBySubdomain(subdomain: string): Promise<{ slug: string }> {
  return apiRequest<{ slug: string }>(`/subdomain/${subdomain}`);
}

// ==================== MENU ====================

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  position: number;
  isActive: boolean;
  imageUrl?: string;
  categoryId: string;
  allergenIds?: string[];
  sizes?: Array<{
    id: string;
    price: number;
    size: { id: string; name: string };
  }>;
  translations?: Array<{
    language: string;
    name: string;
    description?: string;
  }>;
}

export interface MenuCategory {
  id: string;
  name: string;
  position: number;
  isActive: boolean;
  restaurantId: string;
  translations?: Array<{
    language: string;
    name: string;
  }>;
}

export interface Allergen {
  id: string;
  nameEn: string;
  nameHr: string;
  icon?: string;
}

export interface MenuResponse {
  menuItems: MenuItem[];
  drinkItems: MenuItem[];
  allergens: Allergen[];
}

export async function getRestaurantMenu(restaurantId: string): Promise<MenuResponse> {
  return apiRequest<MenuResponse>(`/menu/${restaurantId}`);
}

export async function getMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
  return apiRequest<MenuCategory[]>(`/restaurantDetails/menu/categories/${restaurantId}`);
}

export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  return apiRequest<MenuItem[]>(`/restaurantDetails/menu/menuItems/${restaurantId}`);
}

export async function getAllAllergens(): Promise<Allergen[]> {
  return apiRequest<Allergen[]>('/restaurantDetails/menu/allergens');
}

// ==================== DRINKS ====================

export interface DrinkCategory {
  id: string;
  name: string;
  position: number;
  isActive: boolean;
  restaurantId: string;
  translations?: Array<{
    language: string;
    name: string;
  }>;
}

export interface DrinkItem {
  id: string;
  name: string;
  description?: string;
  price: string;
  position: number;
  isActive: boolean;
  categoryId: string;
  imageUrl?: string;
  imageUrls?: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
  };
  translations?: Array<{
    language: string;
    name: string;
    description?: string;
  }>;
}

export async function getDrinkCategories(restaurantId: string): Promise<DrinkCategory[]> {
  return apiRequest<DrinkCategory[]>(`/restaurantDetails/drinks/categories/${restaurantId}`);
}

export async function getDrinkItems(restaurantId: string): Promise<DrinkItem[]> {
  return apiRequest<DrinkItem[]>(`/restaurantDetails/drinks/drinkItems/${restaurantId}`);
}

// ==================== ANALYTICS ====================

export type AnalyticsEventType =
  | 'restaurant_view'
  | 'click_gallery'
  | 'click_reviews'
  | 'click_reserve'
  | 'click_menu'
  | 'click_menu_item'
  | 'click_phone'
  | 'click_map'
  | 'click_website'
  | 'scan_qr_code';

export interface AnalyticsEvent {
  restaurantId: string;
  eventType: AnalyticsEventType;
  metadata?: Record<string, unknown>;
  source?: 'web' | 'app';
  session_id?: string;
}

export async function logAnalyticsEvent(event: AnalyticsEvent): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/analytics', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

// ==================== CLAIM RESTAURANT ====================

export interface ClaimFilters {
  foodTypes: Array<{ id: string; nameEn: string; nameHr: string; icon?: string }>;
  establishmentTypes: Array<{ id: string; nameEn: string; nameHr: string; icon?: string }>;
  establishmentPerks: Array<{ id: string; nameEn: string; nameHr: string; icon?: string }>;
  mealTypes: Array<{ id: string; nameEn: string; nameHr: string; icon?: string }>;
  dietaryTypes: Array<{ id: string; nameEn: string; nameHr: string; icon?: string }>;
  priceCategories: Array<{ id: string; nameEn: string; nameHr: string; icon?: string; level: number }>;
}

export interface ClaimFormData {
  restaurantId: string;
  restaurantName: string;
  foodTypes?: string[];
  establishmentTypes?: string[];
  establishmentPerks?: string[];
  mealTypes?: string[];
  dietaryTypes?: string[];
  priceCategoryId?: string;
  contactInfo?: string;
  name: string;
  email: string;
  phone: string;
  workingHours?: string;
  hasProfessionalPhotos?: boolean;
  hasMenuItemPhotos?: boolean;
}

export async function getClaimFilters(): Promise<ClaimFilters> {
  return apiRequest<ClaimFilters>('/claim-filters');
}

export async function getClaimRestaurantInfo(restaurantId: string): Promise<{
  id: string;
  name: string;
  address: string;
  place: string;
  slug: string;
}> {
  return apiRequest(`/claim-restaurant/${restaurantId}`);
}

export async function getClaimRestaurantWorkingHours(restaurantId: string): Promise<{
  id: string;
  name: string;
  openingHours?: object;
  workingHoursInfo?: string;
}> {
  return apiRequest(`/claim-restaurant/${restaurantId}/working-hours`);
}

export async function submitClaimForm(data: ClaimFormData): Promise<{
  success: boolean;
  message: string;
  data?: { claimId: string };
}> {
  return apiRequest('/submit-claim', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==================== SESSION HELPER ====================

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('dinver-session-id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('dinver-session-id', sessionId);
  }
  return sessionId;
}

// ==================== LANDING FEED ====================

export interface LandingExperienceImage {
  url: string;
  width?: number;
  height?: number;
  caption?: string;
  isRecommended?: boolean;
}

export interface LandingExperience {
  id: string;
  author: {
    name: string;
    username?: string | null;
    avatarUrl?: string | null;
  };
  restaurant: {
    id: string;
    name: string;
    slug: string;
    place?: string;
    thumbnailUrl?: string | null;
    isPartner: boolean;
  };
  rating: number;
  description: string;
  mealType?: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'sweet' | 'drinks' | null;
  images: LandingExperienceImage[];
  likesCount: number;
  sharesCount: number;
  publishedAt: string;
}

export interface LandingExperiencesResponse {
  experiences: LandingExperience[];
  meta: {
    count: number;
    totalExperiences: number;
    availableCities: string[];
    mealTypes: string[];
  };
}

export interface LandingWhatsNewItem {
  id: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    place?: string;
    logoUrl?: string | null;
    isPartner: boolean;
  };
  category: string;
  content: string;
  imageUrl?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface LandingWhatsNewResponse {
  updates: LandingWhatsNewItem[];
  meta: {
    count: number;
    totalActive: number;
    categories: Array<{
      key: string;
      count: number;
    }>;
  };
}

export interface LandingStatsResponse {
  stats: {
    experiences: number;
    partners: number;
    users: number;
    activeUpdates: number;
  };
}

export async function getLandingExperiences(params?: {
  limit?: number;
  mealType?: string;
  city?: string;
}): Promise<LandingExperiencesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.mealType) searchParams.set('mealType', params.mealType);
  if (params?.city) searchParams.set('city', params.city);

  const query = searchParams.toString();
  return apiRequest<LandingExperiencesResponse>(`/experiences${query ? `?${query}` : ''}`);
}

export async function getLandingWhatsNew(params?: {
  limit?: number;
  category?: string;
}): Promise<LandingWhatsNewResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.category) searchParams.set('category', params.category);

  const query = searchParams.toString();
  return apiRequest<LandingWhatsNewResponse>(`/whats-new${query ? `?${query}` : ''}`);
}

export async function getLandingStats(): Promise<LandingStatsResponse> {
  return apiRequest<LandingStatsResponse>('/stats');
}

// ==================== CONTACT ====================

export interface ContactFormRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  type?: 'general' | 'partnership' | 'support' | 'press' | 'other';
  phone?: string;
}

export interface ContactFormResponse {
  success: boolean;
  message: string;
}

export async function submitContactForm(data: ContactFormRequest): Promise<ContactFormResponse> {
  return apiRequest<ContactFormResponse>('/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==================== PARTNERSHIP ====================

export interface PartnershipInquiryRequest {
  restaurantName: string;
  email: string;
  city: string;
}

export interface PartnershipInquiryResponse {
  success: boolean;
  message: string;
}

export async function submitPartnershipInquiry(data: PartnershipInquiryRequest): Promise<PartnershipInquiryResponse> {
  return apiRequest<PartnershipInquiryResponse>('/partnership', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==================== RESTAURANT EXPERIENCES ====================

export interface RestaurantExperienceImage {
  url: string;
  width?: number;
  height?: number;
  caption?: string;
  isRecommended?: boolean;
}

export interface RestaurantExperience {
  id: string;
  author: {
    name: string;
    username?: string | null;
    avatarUrl?: string | null;
  };
  ratings: {
    food: number;
    ambience: number;
    service: number;
    overall: number;
  };
  description: string;
  mealType?: string | null;
  images: RestaurantExperienceImage[];
  likesCount: number;
  publishedAt: string;
}

export interface RestaurantExperiencesResponse {
  experiences: RestaurantExperience[];
  total: number;
  limit: number;
  offset: number;
}

export async function getRestaurantExperiences(
  restaurantId: string,
  params?: { limit?: number; offset?: number }
): Promise<RestaurantExperiencesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return apiRequest<RestaurantExperiencesResponse>(
    `/restaurants/${restaurantId}/experiences${query ? `?${query}` : ''}`
  );
}

// ==================== SINGLE EXPERIENCE (SHARE PAGE) ====================

export interface SingleExperienceImage {
  url: string;
  width?: number;
  height?: number;
  caption?: string;
  isRecommended?: boolean;
}

export interface SingleExperience {
  id: string;
  author: {
    id: string;
    name: string;
    username?: string | null;
    avatarUrl?: string | null;
  };
  restaurant: {
    id: string;
    name: string;
    slug: string;
    place?: string;
    address?: string;
    thumbnailUrl?: string | null;
    isPartner: boolean;
    latitude?: number;
    longitude?: number;
  };
  ratings: {
    food: number;
    ambience: number;
    service: number;
    overall: number;
  };
  description: string;
  mealType?: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'sweet' | 'drinks' | null;
  images: SingleExperienceImage[];
  likesCount: number;
  sharesCount: number;
  viewCount: number;
  publishedAt: string;
  cityCached?: string;
}

export interface SingleExperienceResponse {
  experience: SingleExperience;
}

export async function getExperienceById(experienceId: string): Promise<SingleExperienceResponse> {
  return apiRequest<SingleExperienceResponse>(`/experiences/${experienceId}`);
}

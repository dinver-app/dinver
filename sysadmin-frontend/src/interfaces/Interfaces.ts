export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt?: string;
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
  working_hours_info?: string;
  thumbnail_url?: string;
  thumbnail?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  is_open_now?: boolean;
  opening_hours?: any;
  food_types?: number[];
  establishment_types?: number[];
  establishment_perks?: number[];
  icon_url?: string;
  photo_reference?: string;
  vicinity?: string;
  business_status?: string;
  geometry?: object;
  icon_background_color?: string;
  icon_mask_base_uri?: string;
  photos?: object[];
  plus_code?: string;
  createdAt?: string;
  updatedAt?: string;
  organizationId?: string;
  isOpen?: string;
  isClaimed?: boolean;
  slug?: string;
  isDirty?: boolean;
  website_url?: string;
  fb_url?: string;
  ig_url?: string;
  phone?: string;
  images?: string[];
}

export interface FoodType {
  id: number;
  name: string;
  icon: string;
}

export interface EstablishmentType {
  id: number;
  name: string;
  icon: string;
}

export interface EstablishmentPerk {
  id: number;
  name: string;
  icon: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  restaurantId: string;
  categoryId: string;
  imageUrl?: string;
  ingredients?: string[];
  allergens?: string[];
  description?: string;
  imageFile?: File;
}

export interface Category {
  id: string;
  name: string;
  restaurantId: string;
  menuItems: MenuItem[];
}

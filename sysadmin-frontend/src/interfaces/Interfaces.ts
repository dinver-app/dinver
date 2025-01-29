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
  description?: string;
  thumbnail_url?: string;
  thumbnail?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  is_open_now?: boolean;
  opening_hours?: string;
  types?: string[];
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
  isOpen?: boolean;
  isClaimed?: boolean;
  slug?: string;
}

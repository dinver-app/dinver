export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

export interface Restaurant {
  id: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: any;
  icon_url?: string;
  slug?: string;
  isClaimed: boolean;
  email?: string;
  isOpen?: boolean;
  reviewRating?: number;
  distance?: number;
}

export interface RestaurantsResponse {
  totalRestaurants: number;
  totalPages: number;
  currentPage: number;
  restaurants: Restaurant[];
  totalRestaurantsCount: number;
  claimedRestaurantsCount: number;
}

export interface RestaurantCardProps {
  name: string;
  distance: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  isClaimed: boolean;
  isPromo?: boolean;
  onFavoritePress?: () => void;
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import Button from '@/components/ui/Button';
import { Messages } from '@/lib/i18n';
import { getPartners, Partner } from '@/lib/api';

interface RestaurantMapProps {
  messages: Messages;
}

// Helper to format rating (can be number, string, or null)
function formatRating(rating: number | string | null | undefined): string | null {
  if (rating === null || rating === undefined) return null;
  const num = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (isNaN(num)) return null;
  return num.toFixed(1);
}

// Get display rating (prefer dinverRating, fallback to Google rating)
function getDisplayRating(restaurant: Partner): string | null {
  if (restaurant.dinverRating) {
    return formatRating(restaurant.dinverRating);
  }
  if (restaurant.rating) {
    return formatRating(restaurant.rating);
  }
  return null;
}

// Fallback mock data in case API fails
const fallbackRestaurants = [
  {
    id: '1',
    name: 'La Pergola',
    address: 'Ilica 72, Zagreb',
    place: 'Zagreb',
    slug: 'la-pergola',
    dinverRating: 9.2,
    dinverReviewsCount: 156,
    latitude: 45.813,
    longitude: 15.966,
    thumbnailUrl: undefined,
    isOpenNow: true,
    foodTypes: ['Italian'],
    isClaimed: true,
  },
  {
    id: '2',
    name: 'Mundoaka',
    address: 'Petrinjska 2, Zagreb',
    place: 'Zagreb',
    slug: 'mundoaka',
    dinverRating: 8.9,
    dinverReviewsCount: 203,
    latitude: 45.811,
    longitude: 15.979,
    thumbnailUrl: undefined,
    isOpenNow: true,
    foodTypes: ['Street Food'],
    isClaimed: true,
  },
  {
    id: '3',
    name: 'Noel',
    address: 'Tratinska 66, Zagreb',
    place: 'Zagreb',
    slug: 'noel',
    dinverRating: 9.5,
    dinverReviewsCount: 89,
    latitude: 45.805,
    longitude: 15.958,
    thumbnailUrl: undefined,
    isOpenNow: false,
    foodTypes: ['Fine Dining'],
    isClaimed: true,
  },
  {
    id: '4',
    name: "Zinfandel's",
    address: 'Mihanović 1, Zagreb',
    place: 'Zagreb',
    slug: 'zinfandels',
    dinverRating: 9.1,
    dinverReviewsCount: 178,
    latitude: 45.808,
    longitude: 15.975,
    thumbnailUrl: undefined,
    isOpenNow: true,
    foodTypes: ['Modern Croatian'],
    isClaimed: true,
  },
  {
    id: '5',
    name: 'Heritage',
    address: 'Na Strossu 4a, Zagreb',
    place: 'Zagreb',
    slug: 'heritage',
    dinverRating: 8.7,
    dinverReviewsCount: 134,
    latitude: 45.815,
    longitude: 15.973,
    thumbnailUrl: undefined,
    isOpenNow: true,
    foodTypes: ['Croatian'],
    isClaimed: true,
  },
];

export default function RestaurantMap({ messages }: RestaurantMapProps) {
  const [restaurants, setRestaurants] = useState<Partner[]>(fallbackRestaurants);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch partners from API
  useEffect(() => {
    async function fetchPartners() {
      try {
        setIsLoading(true);
        const response = await getPartners();
        if (response.partners && response.partners.length > 0) {
          setRestaurants(response.partners);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to fetch partners:', err);
        setError('Failed to load restaurants');
        // Keep fallback data
      } finally {
        setIsLoading(false);
      }
    }

    fetchPartners();
  }, []);

  // Calculate map center based on restaurants
  const getMapCenter = useCallback((): [number, number] => {
    const validRestaurants = restaurants.filter(r => r.latitude && r.longitude);
    if (validRestaurants.length === 0) return [45.81, 15.97]; // Zagreb default

    const avgLat = validRestaurants.reduce((sum, r) => sum + (r.latitude || 0), 0) / validRestaurants.length;
    const avgLng = validRestaurants.reduce((sum, r) => sum + (r.longitude || 0), 0) / validRestaurants.length;

    return [avgLat, avgLng];
  }, [restaurants]);

  useEffect(() => {
    // Dynamically import Leaflet components on client side only
    import('react-leaflet').then(({ MapContainer, TileLayer, Marker, Popup }) => {
      import('leaflet').then((L) => {
        // Fix default marker icon issue with webpack
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Create custom green marker
        const greenIcon = new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
              <path fill="#10B981" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z"/>
              <circle fill="white" cx="12" cy="12" r="5"/>
            </svg>
          `),
          iconSize: [24, 36],
          iconAnchor: [12, 36],
          popupAnchor: [0, -36],
        });

        // Create the map component
        const Map = ({ data, center }: { data: Partner[], center: [number, number] }) => (
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="rounded-2xl"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {data.filter(r => r.latitude && r.longitude).map((restaurant) => (
              <Marker
                key={restaurant.id}
                position={[restaurant.latitude!, restaurant.longitude!]}
                icon={greenIcon}
                eventHandlers={{
                  click: () => setSelectedRestaurant(restaurant.id),
                }}
              >
                <Popup>
                  <div className="p-1">
                    <h4 className="font-bold text-gray-900">{restaurant.name}</h4>
                    <p className="text-sm text-gray-500">{restaurant.foodTypes?.[0] || restaurant.place}</p>
                    {getDisplayRating(restaurant) && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="text-dinver-green" size={14} fill="#10B981" />
                        <span className="text-sm font-medium">{getDisplayRating(restaurant)}</span>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        );

        setMapComponent(() => Map);
      });
    });
  }, []);

  const mapCenter = getMapCenter();

  return (
    <section id="explore" className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {messages.map.title}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {messages.map.subtitle}
          </p>
        </AnimatedSection>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 max-w-3xl mx-auto">
            <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
            <p className="text-amber-800 text-sm">{error}. Showing sample data.</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Map */}
          <AnimatedSection direction="left" className="lg:col-span-2">
            <div className="relative h-[500px] bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
              {MapComponent ? (
                <MapComponent data={restaurants} center={mapCenter} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-dinver-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading map...</p>
                  </div>
                </div>
              )}
            </div>
          </AnimatedSection>

          {/* Restaurant list */}
          <AnimatedSection direction="right">
            <div className="space-y-4 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {isLoading && restaurants.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-4 border-dinver-green border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                restaurants.map((restaurant, index) => (
                  <motion.div
                    key={restaurant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedRestaurant(restaurant.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedRestaurant === restaurant.id
                        ? 'border-dinver-green bg-dinver-green/5'
                        : 'border-gray-100 hover:border-dinver-green/30 bg-white'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {restaurant.thumbnailUrl ? (
                          <img
                            src={restaurant.thumbnailUrl}
                            alt={restaurant.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MapPin className="text-gray-400" size={24} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-gray-900 truncate">{restaurant.name}</h4>
                          {getDisplayRating(restaurant) && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Star className="text-dinver-green" size={14} fill="#10B981" />
                              <span className="text-sm font-bold">{getDisplayRating(restaurant)}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{restaurant.address}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {restaurant.foodTypes?.[0] && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                              {restaurant.foodTypes[0]}
                            </span>
                          )}
                          {restaurant.isOpenNow !== undefined && (
                            <span className={`text-xs flex items-center gap-1 ${
                              restaurant.isOpenNow ? 'text-dinver-green' : 'text-gray-400'
                            }`}>
                              <Clock size={12} />
                              {restaurant.isOpenNow ? 'Open' : 'Closed'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="mt-6">
              <Button variant="outline" className="w-full">
                {messages.map.cta}
                <ExternalLink size={16} className="ml-2" />
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

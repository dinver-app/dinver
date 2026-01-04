'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { MapPin, Star, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { Messages } from '@/lib/i18n';
import { getPartners, Partner } from '@/lib/api';

interface RestaurantMapProps {
  messages: Messages;
  locale?: 'en' | 'hr';
}

// Helper to format rating
function formatRating(rating: number | string | null | undefined): string | null {
  if (rating === null || rating === undefined) return null;
  const num = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (isNaN(num)) return null;
  return num.toFixed(1);
}

function getDisplayRating(restaurant: Partner): string | null {
  if (restaurant.dinverRating) return formatRating(restaurant.dinverRating);
  if (restaurant.rating) return formatRating(restaurant.rating);
  return null;
}

// Fallback mock data
const fallbackRestaurants: Partner[] = [
  {
    id: '1', name: 'La Pergola', address: 'Ilica 72, Zagreb', place: 'Zagreb', slug: 'la-pergola',
    dinverRating: 9.2, dinverReviewsCount: 156, latitude: 45.813, longitude: 15.966,
    foodTypes: ['Italian'], isClaimed: true,
  },
  {
    id: '2', name: 'Mundoaka', address: 'Petrinjska 2, Zagreb', place: 'Zagreb', slug: 'mundoaka',
    dinverRating: 8.9, dinverReviewsCount: 203, latitude: 45.811, longitude: 15.979,
    foodTypes: ['Street Food'], isClaimed: true,
  },
  {
    id: '3', name: 'Noel', address: 'Tratinska 66, Zagreb', place: 'Zagreb', slug: 'noel',
    dinverRating: 9.5, dinverReviewsCount: 89, latitude: 45.805, longitude: 15.958,
    foodTypes: ['Fine Dining'], isClaimed: true,
  },
  {
    id: '4', name: "Zinfandel's", address: 'Mihanović 1, Zagreb', place: 'Zagreb', slug: 'zinfandels',
    dinverRating: 9.1, dinverReviewsCount: 178, latitude: 45.808, longitude: 15.975,
    foodTypes: ['Modern Croatian'], isClaimed: true,
  },
  {
    id: '5', name: 'Heritage', address: 'Na Strossu 4a, Zagreb', place: 'Zagreb', slug: 'heritage',
    dinverRating: 8.7, dinverReviewsCount: 134, latitude: 45.815, longitude: 15.973,
    foodTypes: ['Croatian'], isClaimed: true,
  },
  {
    id: '6', name: 'Takenoko', address: 'Nova Ves 88, Zagreb', place: 'Zagreb', slug: 'takenoko',
    dinverRating: 9.3, dinverReviewsCount: 267, latitude: 45.817, longitude: 15.969,
    foodTypes: ['Japanese'], isClaimed: true,
  },
];

export default function RestaurantMap({ messages, locale = 'hr' }: RestaurantMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [restaurants, setRestaurants] = useState<Partner[]>(fallbackRestaurants);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);

  // Fetch partners from API
  useEffect(() => {
    async function fetchPartners() {
      try {
        const response = await getPartners();
        if (response.partners && response.partners.length > 0) {
          setRestaurants(response.partners);
        }
      } catch (err) {
        console.error('Failed to fetch partners:', err);
      }
    }
    fetchPartners();
  }, []);

  // Calculate map center
  const getMapCenter = useCallback((): [number, number] => {
    const validRestaurants = restaurants.filter(r => r.latitude && r.longitude);
    if (validRestaurants.length === 0) return [45.81, 15.97];
    const avgLat = validRestaurants.reduce((sum, r) => sum + (r.latitude || 0), 0) / validRestaurants.length;
    const avgLng = validRestaurants.reduce((sum, r) => sum + (r.longitude || 0), 0) / validRestaurants.length;
    return [avgLat, avgLng];
  }, [restaurants]);

  // Dynamic Leaflet import
  useEffect(() => {
    import('react-leaflet').then(({ MapContainer, TileLayer, Marker, Popup }) => {
      import('leaflet').then((L) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        const greenIcon = new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
              <path fill="#1E3329" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z"/>
              <circle fill="#FFF5C4" cx="12" cy="12" r="5"/>
            </svg>
          `),
          iconSize: [24, 36],
          iconAnchor: [12, 36],
          popupAnchor: [0, -36],
        });

        const Map = ({ data, center }: { data: Partner[], center: [number, number] }) => (
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} className="rounded-2xl">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {data.filter(r => r.latitude && r.longitude).map((restaurant) => (
              <Marker key={restaurant.id} position={[restaurant.latitude!, restaurant.longitude!]} icon={greenIcon}>
                <Popup>
                  <div className="p-1">
                    <h4 className="font-bold text-gray-900">{restaurant.name}</h4>
                    <p className="text-sm text-gray-500">{restaurant.foodTypes?.[0] || restaurant.place}</p>
                    {getDisplayRating(restaurant) && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="text-dinver-green" size={14} fill="#1E3329" />
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

  // Duplicate restaurants for seamless marquee
  const marqueeRestaurants = [...restaurants, ...restaurants];

  return (
    <section ref={containerRef} id="explore" className="py-24 lg:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            className="inline-flex items-center gap-2 px-4 py-2 bg-dinver-green/10 text-dinver-green rounded-full text-sm font-semibold mb-6"
          >
            <MapPin size={16} />
            {locale === 'hr' ? 'Istraži' : 'Explore'}
          </motion.span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {messages.map.title}
          </h2>
          <p className="mt-4 text-lg text-gray-600">{messages.map.subtitle}</p>
        </AnimatedSection>

        {/* Map */}
        <AnimatedSection>
          <div className="relative h-[450px] bg-gray-100 rounded-3xl overflow-hidden shadow-xl">
            {MapComponent ? (
              <MapComponent data={restaurants} center={mapCenter} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-dinver-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">{locale === 'hr' ? 'Učitavanje karte...' : 'Loading map...'}</p>
                </div>
              </div>
            )}

            {/* Partner count badge */}
            <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-dinver-green rounded-full animate-pulse" />
                <span className="font-bold text-gray-900">{restaurants.length}+</span>
                <span className="text-gray-600 text-sm">
                  {locale === 'hr' ? 'partnera' : 'partners'}
                </span>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Scrolling restaurant marquee */}
        <div className="mt-8 relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="flex gap-4"
          >
            {marqueeRestaurants.map((restaurant, index) => (
              <motion.div
                key={`${restaurant.id}-${index}`}
                whileHover={{ scale: 1.02 }}
                className="flex-shrink-0 w-[280px] p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-dinver-green/30 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar/Icon */}
                  <div className="w-12 h-12 bg-dinver-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    {restaurant.thumbnailUrl ? (
                      <img src={restaurant.thumbnailUrl} alt={restaurant.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-dinver-green font-bold text-lg">{restaurant.name.charAt(0)}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-gray-900 truncate">{restaurant.name}</h4>
                      {getDisplayRating(restaurant) && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="text-amber-500" size={14} fill="#F59E0B" />
                          <span className="text-sm font-bold text-gray-700">{getDisplayRating(restaurant)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{restaurant.foodTypes?.[0] || restaurant.place}</p>
                  </div>

                  <ChevronRight size={18} className="text-gray-300 group-hover:text-dinver-green group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* CTA */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center text-gray-500 text-sm mt-6"
        >
          {locale === 'hr'
            ? 'Preuzmi app za pristup svim partnerskim restoranima'
            : 'Download the app to access all partner restaurants'}
        </motion.p>
      </div>
    </section>
  );
}

/* eslint-disable react-hooks/exhaustive-deps */
import { Restaurant } from '@/services/restaurantService';
import { useEffect, useState } from 'react';
import { Image } from 'react-native';

export const useImagePreloader = (restaurants: Restaurant[], threshold: number = 5) => {
  const [preloadedUrls, setPreloadedUrls] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  
  useEffect(() => {
    if (!restaurants || restaurants.length === 0) {
      return;
    }

    const preloadImages = async () => {
      setLoading(true);
      
      const urlsToLoad = restaurants
        .slice(0, threshold)
        .map(restaurant => restaurant.iconUrl)
        .filter(url => url && !preloadedUrls.has(url));
      
      if (urlsToLoad.length === 0) {
        setLoading(false);
        return;
      }
      
      try {
        await Promise.all(urlsToLoad.map(url => Image.prefetch(url!)));
        
        setPreloadedUrls(prev => {
          const newSet = new Set(prev);
          urlsToLoad.forEach(url => {
            if (url) {
              newSet.add(url);
            }
          });
          return newSet;
        });
      } catch (error) {
        console.error('Error preloading images:', error);
      } finally {
        setLoading(false);
      }
    };
    
    preloadImages();
  }, [restaurants, threshold]);
  
  return {
    loading,
    hasPreloaded: (url: string) => preloadedUrls.has(url),
    preloadedCount: preloadedUrls.size
  };
};

export default useImagePreloader;
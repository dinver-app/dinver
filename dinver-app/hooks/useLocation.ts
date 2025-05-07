import { useState, useCallback, useEffect } from "react";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { searchGooglePlaces } from "@/components/search/LocationSearchBar";

const LOCATION_STORAGE_KEY_PREFIX = "user_location_";
const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "";
const GOOGLE_PLACES_DETAILS_URL =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_DETAILS_URL ||
  "https://maps.googleapis.com/maps/api/place/details/json";
const GOOGLE_PLACES_GEOCODE_URL =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_GEOCODE_URL ||
  "https://maps.googleapis.com/maps/api/geocode/json";

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  permissionGranted: boolean;
}

export interface LocationState extends LocationData {
  loading: boolean;
  error: string | null;
}

const initialState: LocationState = {
  latitude: 0,
  longitude: 0,
  address: "",
  loading: false,
  error: null,
  permissionGranted: false,
};

const getDetailedAddress = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    // Try Google's reverse geocoding first
    const { data } = await axios.get(GOOGLE_PLACES_GEOCODE_URL, {
      params: {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_PLACES_API_KEY,
        language: "hr",
        region: "hr",
      },
    });

    if (data?.results?.[0]?.formatted_address) {
      return data.results[0].formatted_address;
    }

    // Fall back to Expo Location
    const [addressResponse] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (addressResponse) {
      const { street, streetNumber, city } = addressResponse;
      const parts = [];

      if (street)
        parts.push(`${street}${streetNumber ? " " + streetNumber : ""}`);
      if (city) parts.push(city);

      if (parts.length > 0) return parts.join(", ");
    }
  } catch (error) {
    console.error("Error getting address:", error);
  }

  return "Odabrana lokacija";
};

export function useLocation() {
  const [locationState, setLocationState] =
    useState<LocationState>(initialState);
  const { user } = useAuth();

  // Generate storage key based on user email
  const getStorageKey = useCallback(
    () => (user ? `${LOCATION_STORAGE_KEY_PREFIX}${user.email}` : null),
    [user]
  );

  // Load saved location on component mount or user change
  useEffect(() => {
    const loadSavedLocation = async () => {
      try {
        const storageKey = getStorageKey();
        if (!storageKey) {
          setLocationState(initialState);
          return;
        }

        const savedLocationJson = await AsyncStorage.getItem(storageKey);
        if (!savedLocationJson) {
          setLocationState(initialState);
          return;
        }

        const savedLocation = JSON.parse(savedLocationJson);
        setLocationState((prev) => ({
          ...prev,
          ...savedLocation,
          loading: false,
          error: null,
        }));
      } catch (error) {
        console.error("Error loading saved location:", error);
        setLocationState(initialState);
      }
    };

    loadSavedLocation();
  }, [user, getStorageKey]);

  // Save location to AsyncStorage
  const saveLocationToStorage = useCallback(
    async (location: Partial<LocationState>) => {
      const storageKey = getStorageKey();
      if (!storageKey || !location.latitude || !location.longitude) return;

      try {
        const locationToSave = {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || "",
          permissionGranted: location.permissionGranted || false,
        };

        await AsyncStorage.setItem(storageKey, JSON.stringify(locationToSave));
      } catch (error) {
        console.error("Error saving location:", error);
      }
    },
    [getStorageKey]
  );

  // Get current device location
  const getCurrentLocation = useCallback(async () => {
    setLocationState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Check and request permissions if needed
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        status = (await Location.requestForegroundPermissionsAsync()).status;
      }

      if (status !== "granted") {
        setLocationState((prev) => ({
          ...prev,
          loading: false,
          error: "Permission to access location was denied",
          permissionGranted: false,
        }));
        return null;
      }

      // Get device position
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = coords;

      // Start address lookup and update state with coordinates
      setLocationState((prev) => ({
        ...prev,
        latitude,
        longitude,
        permissionGranted: true,
      }));

      // Get address and finalize state
      const address = await getDetailedAddress(latitude, longitude);
      const finalState = {
        latitude,
        longitude,
        address,
        loading: false,
        error: null,
        permissionGranted: true,
      };

      setLocationState(finalState);
      if (user) saveLocationToStorage(finalState);

      return { latitude, longitude, address };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get location";
      setLocationState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        permissionGranted: false,
      }));
      return null;
    }
  }, [saveLocationToStorage, user]);

  // Search for address suggestions using Google Places
  const searchAddressSuggestions = useCallback(async (query: string) => {
    if (!query?.trim() || query.trim().length < 3) return [];

    try {
      return await searchGooglePlaces(query);
    } catch (error) {
      console.error("Error searching addresses:", error);
      return [];
    }
  }, []);

  // Get place details from Google Places API
  const getPlaceDetails = useCallback(async (placeId: string) => {
    try {
      const { data } = await axios.get(GOOGLE_PLACES_DETAILS_URL, {
        params: {
          place_id: placeId,
          fields: "geometry,formatted_address",
          key: GOOGLE_PLACES_API_KEY,
        },
      });

      const location = data?.result?.geometry?.location;
      if (!location?.lat || !location?.lng) {
        throw new Error("Invalid place details response");
      }

      return {
        latitude: location.lat,
        longitude: location.lng,
        address: data.result.formatted_address || "Odabrana lokacija",
      };
    } catch (error) {
      console.error("Error getting place details:", error);
      throw error;
    }
  }, []);

  // Set location from a Google Places place ID
  const setLocationFromPlace = useCallback(
    async (placeId: string) => {
      setLocationState((prev) => ({ ...prev, loading: true }));

      try {
        const { latitude, longitude, address } = await getPlaceDetails(placeId);

        const finalState = {
          latitude,
          longitude,
          address,
          loading: false,
          error: null,
          permissionGranted: true,
        };

        setLocationState(finalState);
        if (user) saveLocationToStorage(finalState);

        return { latitude, longitude, address };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to set location";
        setLocationState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    [getPlaceDetails, saveLocationToStorage, user]
  );

  // Set location from latitude and longitude
  const setLocationFromAddress = useCallback(
    async (latitude: number, longitude: number) => {
      setLocationState((prev) => ({ ...prev, loading: true }));

      try {
        const address = await getDetailedAddress(latitude, longitude);

        const finalState = {
          latitude,
          longitude,
          address,
          loading: false,
          error: null,
          permissionGranted: true,
        };

        setLocationState(finalState);
        if (user) saveLocationToStorage(finalState);

        return finalState;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to set location";
        setLocationState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          permissionGranted: true,
          latitude,
          longitude,
        }));
        return null;
      }
    },
    [saveLocationToStorage, user]
  );

  // Reset location data
  const resetLocation = useCallback(() => {
    const storageKey = getStorageKey();
    if (storageKey) {
      AsyncStorage.removeItem(storageKey).catch((err) =>
        console.error("Error clearing location:", err)
      );
    }
    setLocationState(initialState);
  }, [getStorageKey]);

  return {
    ...locationState,
    getCurrentLocation,
    searchAddressSuggestions,
    setLocationFromAddress,
    setLocationFromPlace,
    setLocationState: useCallback(
      (newState: Partial<LocationState>) =>
        setLocationState((prev) => ({ ...prev, ...newState })),
      []
    ),
    resetLocation,
  };
}

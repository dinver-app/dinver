import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Keyboard,
  ActivityIndicator,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { restaurantService } from "../../services/restaurantService";
import RestaurantCard from "../../components/RestaurantCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Restaurant } from "../../constants/Types";
import debounce from "lodash/debounce";

const Explore = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      setCurrentPage(1);
      setRestaurants([]);
      loadRestaurants(1, query);
    }, 500),
    []
  );

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const loadRestaurants = async (page: number, search?: string) => {
    try {
      setError(null);
      if (page === 1) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await restaurantService.getRestaurants(page, search);

      if (page === 1) {
        setRestaurants(response.restaurants);
      } else {
        setRestaurants((prev) => [...prev, ...response.restaurants]);
      }

      setHasMorePages(page < response.totalPages);
    } catch (error) {
      console.error("Error loading restaurants:", error);
      setError("Problem loading restaurants. Please try again later.");
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadRestaurants(1);
  }, []);

  // Handle reaching end of scroll
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMorePages && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadRestaurants(nextPage, searchQuery);
    }
  };

  // Check if we're near the end of the scroll
  const isCloseToBottom = ({
    layoutMeasurement,
    contentOffset,
    contentSize,
  }: NativeScrollEvent) => {
    const paddingToBottom = 20;
    return (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 bg-black">
        <View className="bg-[#1C1C1E] flex-row items-center rounded-full px-4 py-2 mb-4">
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            placeholder="Find your restaurant"
            placeholderTextColor="#666"
            className="flex-1 ml-2 text-white font-degular"
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery.length > 0 && (
            <Ionicons
              name="close-circle"
              size={20}
              color="#666"
              onPress={() => {
                setSearchQuery("");
                loadRestaurants(1);
              }}
            />
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="never"
        onScrollBeginDrag={() => Keyboard.dismiss()}
        onScroll={({ nativeEvent }) => {
          if (isCloseToBottom(nativeEvent)) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <View className="p-4">
          {/* Error Message */}
          {error && (
            <View className="bg-[#1C1C1E] p-4 rounded-lg mb-4">
              <Text className="text-white text-center font-degular-medium">
                {error}
              </Text>
            </View>
          )}

          {/* Loading State */}
          {loading && (
            <View className="py-4">
              <ActivityIndicator size="large" color="#666" />
            </View>
          )}

          {/* Restaurant List */}
          {!error && !loading && restaurants.length === 0 ? (
            <View className="py-4">
              <Text className="text-white text-center font-degular-medium">
                No restaurants found
              </Text>
            </View>
          ) : (
            restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                name={restaurant.name}
                distance={`${(restaurant.distance || 3.2).toFixed(1)} km`}
                rating={restaurant.rating || restaurant.reviewRating || 4.6}
                reviewCount={restaurant.user_ratings_total || 13}
                imageUrl={
                  restaurant.icon_url || "https://via.placeholder.com/400x300"
                }
                isClaimed={restaurant.isClaimed}
                isPromo={Math.random() > 0.5}
                onFavoritePress={() => {}}
              />
            ))
          )}

          {/* Loading More Indicator */}
          {isLoadingMore && (
            <View className="py-4 flex-row items-center justify-center space-x-2">
              <ActivityIndicator size="small" color="#666" />
              <Text className="text-[#666] font-degular">
                Loading more restaurants...
              </Text>
            </View>
          )}

          {/* End of List Indicator */}
          {!hasMorePages && restaurants.length > 0 && (
            <View className="py-4">
              <Text className="text-[#666] text-center font-degular">
                No more restaurants to load
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Explore;

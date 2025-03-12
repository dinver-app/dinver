import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { restaurantService } from "../../services/restaurantService";
import RestaurantCard from "../../components/RestaurantCard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Restaurant } from "../../constants/Types";

const Explore = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      const response = await restaurantService.getRestaurants(1);
      setRestaurants(response.restaurants);
      setError(null);
    } catch (error) {
      console.error("Error loading restaurants:", error);
      setError("Problem loading restaurants. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 my-4">
        <View className="p-4">
          {/* Search Bar */}
          <View className="bg-[#1C1C1E] flex-row items-center rounded-full px-4 py-2 mb-4">
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              placeholder="Find your restaurant"
              placeholderTextColor="#666"
              className="flex-1 ml-2 text-white font-degular"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-[#1C1C1E] p-4 rounded-lg mb-4">
              <Text className="text-white text-center font-degular-medium">
                {error}
              </Text>
            </View>
          )}

          {/* Restaurant List */}
          {!error &&
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
                isPromo={Math.random() > 0.5} // Samo za demonstraciju
                onFavoritePress={() => {}}
              />
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Explore;

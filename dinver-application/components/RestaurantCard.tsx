import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RestaurantCardProps } from "@/constants/Types";

const RestaurantCard = ({
  name,
  distance,
  rating,
  reviewCount,
  imageUrl,
  isClaimed,
  isPromo = false,
  onFavoritePress,
}: RestaurantCardProps) => {
  return (
    <TouchableOpacity className="mb-4 w-full">
      <View className="relative">
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-48 rounded-lg"
          resizeMode="cover"
        />

        {/* Promo badge */}
        {isPromo && (
          <View className="absolute top-3 left-3 bg-purple-600 px-3 py-1 rounded-full">
            <Text className="text-white font-medium">Promo</Text>
          </View>
        )}

        {/* Favorite button */}
        <TouchableOpacity
          onPress={onFavoritePress}
          className="absolute top-3 right-3"
        >
          <View className="bg-black/30 p-2 rounded-full">
            <Ionicons name="heart-outline" size={24} color="white" />
          </View>
        </TouchableOpacity>

        {/* Rating */}
        <View className="absolute bottom-3 right-3 bg-black/30 px-2 py-1 rounded-full flex-row items-center">
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text className="text-white ml-1">
            {rating} ({reviewCount})
          </Text>
        </View>
      </View>

      {/* Restaurant info */}
      <View className="flex-row justify-between items-center mt-2">
        <View className="flex-row items-center">
          <Text className="text-white text-lg font-semibold">{name}</Text>
          {isClaimed && (
            <Ionicons
              name="checkmark-circle"
              size={16}
              color="#4CAF50"
              className="ml-1"
            />
          )}
        </View>
        <Text className="text-gray-400">{distance}</Text>
      </View>

      {/* Icons at bottom */}
      <View className="flex-row mt-1">
        <Ionicons name="restaurant-outline" size={20} color="#666" />
        <Ionicons name="wine-outline" size={20} color="#666" className="ml-2" />
      </View>
    </TouchableOpacity>
  );
};

export default RestaurantCard;

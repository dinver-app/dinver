import React, { useCallback, useEffect } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useFavorites } from "@/hooks/useFavorites";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { FavoriteRestaurant } from "@/utils/validation";
import { useIsFocused } from "@react-navigation/native";
import { SavedGreenHeartIcon, SavedYellowStar } from "@/assets/icons/icons";
import { useTheme } from "@/context/ThemeContext";
import { router } from "expo-router";

interface RestaurantItemProps {
  restaurant: FavoriteRestaurant;
  onPress?: () => void;
}

const FALLBACK_IMAGE_URL =
  "https://dinver-restaurant-thumbnails.s3.eu-north-1.amazonaws.com/restaurant_thumbnails/stock.jpg";

const RestaurantItem = ({ restaurant, onPress }: RestaurantItemProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <View className="flex-row">
        <Image
          source={{ uri: restaurant.thumbnailUrl || FALLBACK_IMAGE_URL }}
          className="w-[64px] h-[64px] rounded-[16px] mr-[16px]"
        />
        <View className="flex-1 justify-center">
          <View className="flex-row items-center justify-between">
            <Text
              className="font-degular-medium text-[14px] leading-[21px]"
              style={{ color: colors.textPrimary }}
            >
              {restaurant.name}
            </Text>
            <SavedGreenHeartIcon />
          </View>
          {restaurant.address && (
            <Text
              className="font-degular text-[14px] leading-[20px]"
              style={{ color: colors.textSecondary }}
            >
              {restaurant.address}
            </Text>
          )}

          <View className="flex-row items-center mt-[4px]">
            <SavedYellowStar />
            <Text className="ml-[4px] font-roboto text-[14px] leading-[20px] text-[#FACC15]">
              {restaurant.rating}
            </Text>
            {restaurant.priceLevel && (
              <>
                <Text
                  className="mx-[8px]"
                  style={{ color: colors.textSecondary }}
                >
                  •
                </Text>
                <Text
                  className="font-roboto text-[14px] leading-[20px]"
                  style={{ color: colors.textSecondary }}
                >
                  {"$".repeat(restaurant.priceLevel)}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SavedCard = () => {
  const { favorites, isLoading, loadFavorites } = useFavorites();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const { colors } = useTheme();

  useEffect(() => {
    if (user && isFocused) {
      loadFavorites();
    }
  }, [user, loadFavorites, isFocused]);

  const navigateToRestaurantDetail = useCallback((restaurantId: string) => {
    console.log(`Navigate to restaurant detail: ${restaurantId}`);
  }, []);

  if (!user) return null;

  if (isLoading && (!favorites || favorites.length === 0)) {
    return (
      <View
        className="rounded-[16px] p-[16px]"
        style={{ backgroundColor: colors.cardBackground }}
      >
        <Text
          className="font-degular-medium text-[18px] leading-[28px]"
          style={{ color: colors.textPrimary }}
        >
          {t("profile.savedRestaurants")}
        </Text>
        <View className="items-center justify-center py-[16px]">
          <Text style={{ color: colors.textSecondary }}>
            {t("common.loading")}
          </Text>
        </View>
      </View>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <View
        className="rounded-[16px] p-[16px]"
        style={{ backgroundColor: colors.cardBackground }}
      >
        <Text
          className="font-degular-medium text-[18px] leading-[28px]"
          style={{ color: colors.textPrimary }}
        >
          {t("profile.savedRestaurants")}
        </Text>
        <View className="items-center justify-center py-[16px]">
          <Text style={{ color: colors.textSecondary }}>
            {t("profile.noSavedRestaurants")}
          </Text>
        </View>
      </View>
    );
  }

  const sortedFavorites = [...favorites].reverse();

  return (
    <View
      className="rounded-[16px] p-[16px]"
      style={{ backgroundColor: colors.cardBackground }}
    >
      <View className="flex-row justify-between items-center mb-[16px]">
        <Text
          className="font-degular-medium text-[18px] leading-[28px]"
          style={{ color: colors.textPrimary }}
        >
          {t("profile.savedRestaurants")}
        </Text>
        <TouchableOpacity onPress={() => router.push("/(screens)/favorites")}>
          <Text
            className="font-degular text-[14px] leading-[20px]"
            style={{ color: colors.appPrimary }}
          >
            {t("common.viewAll")}
          </Text>
        </TouchableOpacity>
      </View>

      {sortedFavorites.slice(0, 2).map((restaurant, index) => (
        <View key={restaurant.id} className={index > 0 ? "mt-[16px]" : ""}>
          <RestaurantItem
            restaurant={restaurant}
            onPress={() => navigateToRestaurantDetail(restaurant.id)}
          />
        </View>
      ))}
    </View>
  );
};

export default SavedCard;

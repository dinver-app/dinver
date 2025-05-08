/* eslint-disable react/display-name */
import { VerifiedBadge } from "@/assets/icons/icons";
import { useTheme } from "@/context/ThemeContext";
import { Restaurant } from "@/utils/validation";
import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { ImageBackground, Text, TouchableOpacity, View } from "react-native";
import { formatDistance } from "./RestaurantCard";

interface SpecialOfferCardProps {
  restaurant: Restaurant;
  discount?: string;
  onPress?: () => void;
}

const FALLBACK_IMAGE_URL =
  "https://dinver-restaurant-thumbnails.s3.eu-north-1.amazonaws.com/restaurant_thumbnails/stock.jpg";

const SpecialOfferCard: React.FC<SpecialOfferCardProps> = memo(
  ({ restaurant, discount = "30% on everything", onPress }) => {
    const { t } = useTranslation();
    const { colors } = useTheme();

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        className="w-[305px] mr-[8px]"
        accessible={true}
        accessibilityLabel={t(
          "restaurant.specialOfferAccessibility",
          "Special offer: {{discount}} at {{restaurantName}}",
          { discount, restaurantName: restaurant.name }
        )}
        accessibilityRole="button"
      >
        <View className="rounded-[10px] overflow-hidden">
          <ImageBackground
            source={{
              uri: (restaurant as any).thumbnailUrl || FALLBACK_IMAGE_URL,
            }}
            className="h-[140px] w-full justify-start"
            resizeMode="cover"
          >
            <View
              style={{ backgroundColor: colors.appPrimary }}
              className="rounded-[4px] px-[8px] py-[6px] m-[10px] self-start"
            >
              <Text
                style={{ color: "white" }}
                className="font-degular-semibold text-[14px]"
              >
                {discount}
              </Text>
            </View>
          </ImageBackground>
        </View>
        <View className="pt-[6px] pl-[10px]">
          <View className="flex-row items-center gap-[6px]">
            <Text
              numberOfLines={1}
              style={{ color: colors.textPrimary }}
              className="text-[20px] font-degular-bold"
            >
              {restaurant.name}
            </Text>
            <VerifiedBadge />
          </View>
          <View className="flex-row items-center gap-[4px]">
            <Text
              style={{ color: colors.textSecondary }}
              className="font-degular text-[16px]"
            >
              {formatDistance(restaurant.distance)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

export default SpecialOfferCard;

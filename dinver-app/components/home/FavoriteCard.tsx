import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { FavoriteRestaurant } from "@/utils/validation";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { HeartIcon } from "@/assets/icons/icons";

interface FavoriteCardProps {
  item: FavoriteRestaurant;
  colors: any;
  t: (key: string, defaultValue: string) => string;
  handleRemoveFavorite: (restaurantId: string) => void;
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({
  item,
  colors,
  t,
  handleRemoveFavorite,
}) => {
  return (
    <View
      className="flex-row items-center p-4 rounded-2xl mb-4"
      style={{ backgroundColor: colors.cardBackground }}
    >
      <Image
        source={{ uri: item.iconUrl }}
        className="w-20 h-20 rounded-xl"
        resizeMode="cover"
      />
      <View className="flex-1 ml-4">
        <Text
          className="text-lg font-degular-bold mb-1"
          style={{ color: colors.textPrimary }}
        >
          {item.name}
        </Text>
        <Text
          className="text-sm font-degular mb-1"
          style={{ color: colors.textSecondary }}
        >
          {item.address}
        </Text>
        <View className="flex-row items-center">
          <Text
            className="text-sm font-degular mr-2"
            style={{ color: colors.textSecondary }}
          >
            {item.rating} ★
          </Text>
          {item.priceLevel && (
            <Text
              className="text-sm font-degular"
              style={{ color: colors.textSecondary }}
            >
              {"• " + "€".repeat(item.priceLevel)}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveFavorite(item.id)}
        className="p-2"
      >
        <HeartIcon color={colors.appPrimary} size={24} />
      </TouchableOpacity>
    </View>
  );
};

export default FavoriteCard;

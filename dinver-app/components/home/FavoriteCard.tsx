import React from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  Image,
} from "react-native";
import { FavoriteRestaurant } from "@/utils/validation";
import { VerifiedBadge } from "@/assets/icons/icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Octicons } from "@expo/vector-icons";

interface FavoriteCardProps {
  item: FavoriteRestaurant & {
    isFavorite?: boolean;
    isClaimed?: boolean;
    thumbnailUrl?: string;
    userRatingsTotal?: number;
  };
  colors: any;
  t: (key: string, defaultValue: string) => string;
  handleRemoveFavorite: (restaurantId: string) => void;
}

const FALLBACK_IMAGE_URL =
  "https://dinver-restaurant-thumbnails.s3.eu-north-1.amazonaws.com/restaurant_thumbnails/stock.jpg";

const FavoriteCard: React.FC<FavoriteCardProps> = ({
  item,
  colors,
  t,
  handleRemoveFavorite,
}) => {
  const imageSource = { uri: item.thumbnailUrl || FALLBACK_IMAGE_URL };

  const hasRating = item.rating != null;

  return (
    <View style={{ marginBottom: 18 }}>
      <View className="rounded-[10px] overflow-hidden">
        <ImageBackground
          className="h-[170px] w-full"
          source={imageSource}
          resizeMode="cover"
        >
          {/* Heart icon (always filled) */}
          <TouchableOpacity
            onPress={() => handleRemoveFavorite(item.id)}
            className="absolute top-[10px] right-[10px] rounded-lg p-1"
            accessibilityLabel={t("favorites.remove", "Remove from favorites")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="heart" size={24} color="#FF4343" />
          </TouchableOpacity>
          {/* Rating badge */}
          {hasRating && (
            <View
              style={{ backgroundColor: "#0D0D0D" }}
              className="absolute bottom-[10px] right-[10px] flex-row items-center rounded-[4px] px-2 py-[8px] gap-[4px]"
            >
              <MaterialCommunityIcons name="star" color="#F3B200" size={16} />
              <Text style={{ color: "white" }} className="text-[12px]">
                {item.rating?.toFixed(1)}
                {item.userRatingsTotal ? ` (${item.userRatingsTotal})` : ""}
              </Text>
            </View>
          )}
        </ImageBackground>
      </View>
      <View className="pt-[6px] pl-[10px]">
        <View className="flex-row items-center gap-[6px] flex-1">
          <Text
            numberOfLines={1}
            style={{ color: colors.textPrimary }}
            className="text-[20px] font-degular-bold"
          >
            {item.name}
          </Text>
          {item.isClaimed && <VerifiedBadge />}
        </View>
        <View className="flex-row items-center gap-[4px]">
          <Text
            style={{ color: colors.textSecondary }}
            className="font-degular text-[16px]"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.address}
            {item.place ? `, ${item.place}` : ""}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default FavoriteCard;

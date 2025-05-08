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

const fallbackImage = require("@/assets/images/avatar.jpg");

const FavoriteCard: React.FC<FavoriteCardProps> = ({
  item,
  colors,
  t,
  handleRemoveFavorite,
}) => {
  const imageSource = item.thumbnailUrl
    ? { uri: item.thumbnailUrl }
    : item.iconUrl
    ? { uri: item.iconUrl }
    : fallbackImage;

  return (
    <View
      className="mb-6 rounded-[12px] overflow-hidden relative"
      style={{ backgroundColor: colors.cardBackground }}
    >
      <ImageBackground
        source={imageSource}
        className="h-[180px] w-full"
        resizeMode="cover"
        style={{ backgroundColor: colors.cardBackground }}
        imageStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
      >
        {/* Heart icon */}
        <TouchableOpacity
          className="absolute top-4 right-4 z-10"
          style={{ borderRadius: 999, padding: 6 }}
          onPress={() => handleRemoveFavorite(item.id)}
        >
          <MaterialCommunityIcons name={"heart"} size={28} color="#FF4343" />
        </TouchableOpacity>
        {/* Rating badge */}
        <View
          className="absolute bottom-4 right-4 flex-row items-center px-2 py-1 rounded-md"
          style={{ backgroundColor: "#18181b" }}
        >
          <MaterialCommunityIcons name="star" size={18} color="#F3B200" />
          <Text className="ml-1 text-white font-bold text-base">
            {item.rating?.toFixed(1) || "-"}
          </Text>
          {item.userRatingsTotal !== undefined && (
            <Text className="ml-1 text-white text-xs">
              ({item.userRatingsTotal})
            </Text>
          )}
        </View>
      </ImageBackground>
      {/* Name and verified badge */}
      <View className="flex-row items-center px-4 py-3 bg-transparent">
        <Text
          className="font-degular mr-2"
          style={{ color: colors.textPrimary, fontSize: 18 }}
        >
          {item.name}
        </Text>
        {item.isClaimed && <VerifiedBadge />}
      </View>
    </View>
  );
};

export default FavoriteCard;

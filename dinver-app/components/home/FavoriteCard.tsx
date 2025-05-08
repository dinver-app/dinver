import React from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  Image,
} from "react-native";
import { FavoriteRestaurant } from "@/utils/validation";
import { useTheme } from "@/context/ThemeContext";
import { HeartIcon, StarIcon, VerifiedBadge } from "@/assets/icons/icons";

interface FavoriteCardProps {
  item: FavoriteRestaurant;
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

  console.log(item);

  return (
    <View
      className="mb-6 rounded-[16px] overflow-hidden relative"
      style={{ backgroundColor: colors.cardBackground }}
    >
      <ImageBackground
        source={imageSource}
        className="h-[180px] w-full"
        resizeMode="cover"
        style={{ backgroundColor: colors.cardBackground }}
        imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
      >
        {/* Heart icon */}
        <TouchableOpacity
          className="absolute top-4 right-4 z-10"
          style={{
            backgroundColor: "#18181b99",
            borderRadius: 999,
            padding: 6,
          }}
          onPress={() => handleRemoveFavorite(item.id)}
        >
          <HeartIcon color={colors.appPrimary} size={24} />
        </TouchableOpacity>
        {/* Rating badge */}
        <View
          className="absolute bottom-4 right-4 flex-row items-center px-2 py-1 rounded-md"
          style={{ backgroundColor: "#18181b" }}
        >
          <StarIcon color="#FFD600" size={16} />
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
          className="text-lg font-degular-bold mr-2"
          style={{ color: colors.textPrimary }}
        >
          {item.name}
        </Text>
        {item.isClaimed && <VerifiedBadge />}
      </View>
    </View>
  );
};

export default FavoriteCard;

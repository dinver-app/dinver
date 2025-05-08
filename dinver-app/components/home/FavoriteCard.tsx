import React, { useState } from "react";
import { View, Text, ImageBackground, TouchableOpacity } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { VerifiedBadge, HeartIcon, StarIcon } from "@/assets/icons/icons";

interface FavoriteCardProps {
  item: any;
  colors: any;
  t: any;
  handleRemoveFavorite: (item: any) => void;
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({
  item,
  colors,
  t,
  handleRemoveFavorite,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <View className="mb-6 rounded-[16px] overflow-hidden relative">
      {!imageLoaded && (
        <SkeletonPlaceholder borderRadius={16}>
          <SkeletonPlaceholder.Item
            width="100%"
            height={180}
            borderRadius={16}
          />
        </SkeletonPlaceholder>
      )}
      <ImageBackground
        source={
          item.thumbnailUrl
            ? { uri: item.thumbnailUrl }
            : item.iconUrl
            ? { uri: item.iconUrl }
            : undefined
        }
        className="h-[180px] w-full"
        resizeMode="cover"
        style={{
          backgroundColor: colors.cardBackground,
          position: imageLoaded ? "relative" : "absolute",
        }}
        onLoadEnd={() => setImageLoaded(true)}
      >
        {/* Heart icon */}
        <TouchableOpacity
          className="absolute top-4 right-4 z-10"
          style={{
            backgroundColor: "#18181b99",
            borderRadius: 999,
            padding: 6,
          }}
          onPress={() => handleRemoveFavorite(item)}
          accessibilityLabel={t(
            "common.removeFavorite",
            "Remove from favorites"
          )}
        >
          <HeartIcon color="#EF4444" size={28} />
        </TouchableOpacity>
        {/* Rating */}
        <View
          className="absolute bottom-4 right-4 flex-row items-center rounded-[6px] px-2 py-1"
          style={{ backgroundColor: "#18181b" }}
        >
          <StarIcon color="#FACC15" size={18} />
          <Text className="ml-1 text-white font-medium text-[16px]">
            {item.rating?.toFixed(1)}
          </Text>
          <Text className="ml-1 text-white text-[14px]">(13)</Text>
        </View>
      </ImageBackground>
      <View className="flex-row items-center mt-2">
        <Text
          className="text-[20px] font-degular-bold"
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

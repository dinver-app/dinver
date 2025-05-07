/* eslint-disable import/no-named-as-default */
/* eslint-disable react/display-name */
import { VerifiedBadge } from "@/assets/icons/icons";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import useFavorites from "@/hooks/useFavorites";
import { Restaurant } from "@/services/restaurantService";
import { Octicons } from "@expo/vector-icons";
import React, { memo, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export const formatDistance = (distance?: number): string => {
  if (distance == null) return "-";
  return distance < 1
    ? `${(distance * 1000).toFixed(0)} m`
    : `${distance.toFixed(1)} km`;
};

interface RestaurantCardProps {
  restaurant: Restaurant;
  index?: number;
  onPress?: () => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = memo(
  ({ restaurant, index = -1, onPress }) => {
    const { user } = useAuth();
    const { isFavorite, toggleFavorite } = useFavorites();
    const { colors } = useTheme();
    const [isToggling, setIsToggling] = useState(false);
    const [liked, setLiked] = useState(false);
    const showPromo = index === 0;
    const hasRating = restaurant.rating != null;

    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
      if (user) setLiked(isFavorite(restaurant.id));
      else setLiked(false);
    }, [user, restaurant.id, isFavorite]);

    useEffect(() => {
      if (restaurant.iconUrl) {
        setImageLoading(true);
        setImageError(false);

        let isMounted = true;
        
        const prefetchTimeout = setTimeout(() => {
          if (restaurant.iconUrl) {
            Image.prefetch(restaurant.iconUrl)
              .then(() => {
                if (isMounted) {
                  setImageLoading(false);
                }
              })
              .catch(() => {
                if (isMounted) {
                  setImageError(true);
                  setImageLoading(false);
                }
              });
          }
        }, 50);

        return () => {
          isMounted = false;
          clearTimeout(prefetchTimeout);
        };
      }
    }, [restaurant.iconUrl]);

    const handleToggleLike = useCallback(async () => {
      if (!user || isToggling) return;

      try {
        setIsToggling(true);
        setLiked(!liked);
        await toggleFavorite(restaurant);
      } catch (error) {
        console.error("Error toggling favorite:", error);
        setLiked(liked);
      } finally {
        setIsToggling(false);
      }
    }, [user, isToggling, toggleFavorite, restaurant, liked]);

    const BG_OVERLAY = "#0005";

    return (
      <TouchableOpacity
        activeOpacity={onPress ? 0.8 : 1}
        onPress={onPress}
        disabled={!onPress}
        accessible={!!onPress}
        accessibilityLabel={`View ${restaurant.name} details`}
        accessibilityRole="button"
      >
        <View>
          <View className="rounded-[10px] overflow-hidden">
            {imageLoading ? (
              <View
                className="h-[170px] w-full justify-center items-center"
                style={{ backgroundColor: colors.cardBackground }}
              >
                <ActivityIndicator size="small" color={colors.appPrimary} />
              </View>
            ) : imageError ? (
              <View
                className="h-[170px] w-full justify-center items-center"
                style={{ backgroundColor: colors.cardBackground }}
              >
                <Octicons name="image" size={32} color={colors.textSecondary} />
              </View>
            ) : (
              <ImageBackground
                className="h-[170px] w-full"
                source={{ uri: restaurant.iconUrl }}
                resizeMode="cover"
              >
                {showPromo && (
                  <View
                    style={{ backgroundColor: colors.appSecondary }}
                    className="absolute top-[10px] left-[10px] rounded-[4px] px-[8px] py-[6px]"
                  >
                    <Text
                      style={{ color:"white" }}
                      className="font-degular text-[14px]"
                    >
                      Promo
                    </Text>
                  </View>
                )}
                {user && (
                  <TouchableOpacity
                    onPress={handleToggleLike}
                    className="absolute top-[10px] right-[10px] rounded-lg p-1"
                    style={{ backgroundColor: BG_OVERLAY }}
                    disabled={isToggling}
                    accessibilityLabel={
                      liked ? "Remove from favorites" : "Add to favorites"
                    }
                    accessibilityRole="button"
                  >
                    <Octicons
                      name={liked ? "heart-fill" : "heart"}
                      size={24}
                      color={liked ? colors.like : "white"}
                    />
                  </TouchableOpacity>
                )}
                {hasRating && (
                  <View
                    style={{ backgroundColor: "#0D0D0D" }}
                    className="absolute bottom-[10px] right-[10px] flex-row items-center rounded-[4px] px-2 py-[8px] gap-[4px]"
                  >
                    <Octicons name="star-fill" color={colors.star} size={16} />
                    <Text
                      style={{ color:"white" }}
                      className="text-[12px]"
                    >
                      {restaurant.rating?.toFixed(1)}
                      {restaurant.userRatingsTotal
                        ? ` (${restaurant.userRatingsTotal})`
                        : ""}
                    </Text>
                  </View>
                )}
              </ImageBackground>
            )}
          </View>

          <View className="pt-[6px] pl-[10px]">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-[6px] flex-1">
                <Text
                  numberOfLines={1}
                  style={{ color: colors.textPrimary }}
                  className="text-[20px] font-degular-bold"
                >
                  {restaurant.name}
                </Text>
                <VerifiedBadge />
              </View>
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
        </View>
      </TouchableOpacity>
    );
  }
);
export default RestaurantCard;

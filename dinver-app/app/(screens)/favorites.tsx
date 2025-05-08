import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import {
  View,
  Text,
  FlatList,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState, useMemo, useCallback } from "react";
import { router } from "expo-router";
import useFavorites from "@/hooks/useFavorites";
import SearchBar from "@/components/search/SearchBar";
import { VerifiedBadge, HeartIcon, StarIcon } from "@/assets/icons/icons";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import FavoriteCard from "@/components/home/FavoriteCard";

export default function Favorites() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, isLoading } = useAuth();
  const {
    favorites,
    isLoading: favLoading,
    toggleFavorite,
    loadFavorites,
  } = useFavorites();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) loadFavorites();
  }, [user]);

  const filteredFavorites = useMemo(() => {
    if (!search.trim()) return favorites;
    return favorites.filter((fav) =>
      fav.name.toLowerCase().includes(search.trim().toLowerCase())
    );
  }, [favorites, search]);

  const handleRemoveFavorite = useCallback(
    (restaurant: any) => {
      toggleFavorite(restaurant);
    },
    [toggleFavorite]
  );

  const renderFavorite = ({ item }: { item: any }) => (
    <FavoriteCard
      item={item}
      colors={colors}
      t={t}
      handleRemoveFavorite={handleRemoveFavorite}
    />
  );

  if (!user && !isLoading) {
    return (
      <ThemedView className="flex-1 justify-center items-center px-6">
        <Text
          className="text-lg text-center mb-6"
          style={{ color: colors.textPrimary }}
        >
          {t(
            "favorites.loginToView",
            "Prijavite se kako biste vidjeli svoje favorite"
          )}
        </Text>
        <TouchableOpacity
          className="px-6 py-3 rounded-full"
          style={{ backgroundColor: colors.appPrimary }}
          onPress={() => router.replace("/(screens)/profile")}
        >
          <Text className="text-white text-base font-bold">
            {t("favorites.goToLogin", "Prijavi se")}
          </Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  if (isLoading || favLoading) {
    return (
      <ThemedView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={colors.appPrimary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1 px-3 pt-8">
      <Text
        className="text-[20px] font-degular-bold mb-2"
        style={{ color: colors.textPrimary }}
      >
        {t("common.favorites", "Favorites")}
      </Text>
      <View className="mb-4">
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch("")}
          placeholder={t(
            "favorites.searchSavedRestaurants",
            "Search saved restaurants"
          )}
        />
      </View>
      {filteredFavorites.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text
            style={{ color: colors.textSecondary }}
            className="text-lg text-center mt-12"
          >
            {t("favorites.noFavorites", "You have no saved restaurants.")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFavorites}
          keyExtractor={(item) => item.id}
          renderItem={renderFavorite}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </ThemedView>
  );
}

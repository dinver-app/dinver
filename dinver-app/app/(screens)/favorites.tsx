import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { View, FlatList, Text, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";
import { useFavorites } from "@/hooks/useFavorites";
import FavoriteCard from "../../components/home/FavoriteCard";

export default function Favorites() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, isLoading } = useAuth();
  const { favorites, loading, handleRemoveFavorite } = useFavorites();

  if (isLoading) {
    return (
      <ThemedView className="flex-1">
        <View className="flex-1 justify-center items-center">
          <Text style={{ color: colors.textSecondary }}>
            {t("common.loading")}
          </Text>
        </View>
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView className="flex-1">
        <View className="flex-1 justify-center items-center px-4">
          <Text
            className="text-xl font-degular-bold mb-4 text-center"
            style={{ color: colors.textPrimary }}
          >
            {t("favorites.loginRequired", "Sign in to view your favorites")}
          </Text>
          <Text
            className="text-base font-degular mb-6 text-center"
            style={{ color: colors.textSecondary }}
          >
            {t(
              "favorites.loginDescription",
              "Create an account or sign in to save your favorite restaurants and access them anytime."
            )}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(screens)/profile")}
            className="px-6 py-3 rounded-full"
            style={{ backgroundColor: colors.appPrimary }}
          >
            <Text className="text-white font-degular-bold">
              {t("common.signIn", "Sign In")}
            </Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      <View className="flex-1 px-4">
        <Text
          className="text-2xl font-degular-bold mb-4"
          style={{ color: colors.textPrimary }}
        >
          {t("favorites.title", "My Favorites")}
        </Text>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <Text style={{ color: colors.textSecondary }}>
              {t("common.loading")}
            </Text>
          </View>
        ) : favorites.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text style={{ color: colors.textSecondary }}>
              {t("favorites.noFavorites", "You have no saved restaurants.")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FavoriteCard
                item={item}
                colors={colors}
                t={t}
                handleRemoveFavorite={handleRemoveFavorite}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </ThemedView>
  );
}

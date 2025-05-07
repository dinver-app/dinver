import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { View } from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";

export default function Favorites() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(screens)/profile');
    }
  }, [user, isLoading]);
  if (isLoading || !user) {
    return null;
  }

  return (
    <ThemedView className="flex-1">
      <View className="flex-1 justify-center items-center">
      
      </View>
    </ThemedView>
  );
}

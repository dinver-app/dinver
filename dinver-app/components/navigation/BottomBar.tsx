import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@/context/NavigationContext";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { usePathname } from "expo-router";
import { useAuth } from "@/context/AuthContext";

import {
  HomeIcon,
  SearchIcon,
  FavoritesIcon,
  ProfileIcon,
} from "@/assets/icons/icons";

interface BottomBarItemProps {
  label: string;
  icon: (color: string) => React.ReactNode;
  route: string;
  isActive: boolean;
  onPress: () => void;
  color: string;
  inactiveColor: string;
}

const BottomBarItem: React.FC<BottomBarItemProps> = ({
  label,
  icon,
  isActive,
  onPress,
  color,
  inactiveColor,
}) => {
  const currentColor = isActive ? color : inactiveColor;

  return (
    <TouchableOpacity
      className="flex-1 items-center justify-center py-2"
      onPress={onPress}
      disabled={isActive}
      activeOpacity={isActive ? 1 : 0.2}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <View className="items-center justify-center">
        <View className="items-center justify-center h-6 mb-0.5">
          {icon(currentColor)}
        </View>
        <Text
          className="text-[10px] font-normal text-center mt-0.5 leading-[14px]"
          style={{ color: currentColor }}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
const BottomBar: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { navigateTo } = useNavigation();
  const currentPath = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isActive = (route: string): boolean => {
    if (route === "/(screens)/profile") {
      return (
        currentPath === "/(screens)/profile" ||
        currentPath === "/(screens)/profile/index" ||
        currentPath === "/profile" ||
        currentPath === "/profile/index"
      );
    }
    const routeBase = route.replace("/(screens)/", "/");
    return currentPath === route || currentPath === routeBase;
  };

  return (
    <View
      className="flex-row border-t-[1px] shadow-none"
      style={{
        backgroundColor: colors.cardBackground,
        borderTopColor: colors.border,
        paddingBottom: insets.bottom || 8,
      }}
    >
      <BottomBarItem
        label={t("common.home", "Home")}
        icon={(color) => <HomeIcon color={color} />}
        route="/(screens)/home"
        isActive={isActive("/(screens)/home")}
        onPress={() => navigateTo("/(screens)/home")}
        color={colors.appPrimary}
        inactiveColor={colors.textSecondary}
      />

      <BottomBarItem
        label={t("common.search", "Search")}
        icon={(color) => <SearchIcon color={color} />}
        route="/(screens)/explore"
        isActive={isActive("/(screens)/explore")}
        onPress={() => navigateTo("/(screens)/explore")}
        color={colors.appPrimary}
        inactiveColor={colors.textSecondary}
      />

      <BottomBarItem
        label={t("common.favorites", "Favorites")}
        icon={(color) => <FavoritesIcon color={color} />}
        route="/(screens)/favorites"
        isActive={isActive("/(screens)/favorites")}
        onPress={() => navigateTo("/(screens)/favorites")}
        color={colors.appPrimary}
        inactiveColor={colors.textSecondary}
      />

      <BottomBarItem
        label={t("common.profile", "Profile")}
        icon={(color) => <ProfileIcon color={color} />}
        route="/(screens)/profile"
        isActive={isActive("/(screens)/profile")}
        onPress={() => navigateTo("/(screens)/profile")}
        color={colors.appPrimary}
        inactiveColor={colors.textSecondary}
      />
    </View>
  );
};

export default BottomBar;

import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Slot, usePathname } from "expo-router";
import { View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { NavigationProvider } from "@/context/NavigationContext";
import BottomBar from "@/components/navigation/BottomBar";

const MainLayout = () => {
  const { colors } = useTheme();
  const currentPath = usePathname();
  const shouldShowBottomBar = () => {
    return (
      currentPath === "/(screens)/home" ||
      currentPath === "/home" ||
      currentPath === "/(screens)/explore" ||
      currentPath === "/explore" ||
      currentPath === "/(screens)/favorites" ||
      currentPath === "/favorites" ||
      currentPath === "/(screens)/profile" ||
      currentPath === "/profile" ||
      currentPath === "/(screens)/profile/index" ||
      currentPath === "/profile/index"
    );
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      edges={["top"]}
    >
      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      {shouldShowBottomBar() && <BottomBar />}
    </SafeAreaView>
  );
};

const ScreensLayout = () => {
  return (
    <NavigationProvider>
      <MainLayout />
    </NavigationProvider>
  );
};

export default ScreensLayout;

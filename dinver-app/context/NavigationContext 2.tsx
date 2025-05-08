import React, { createContext, useContext, useState, useCallback } from "react";
import { router } from "expo-router";

type NavigationContextType = {
  currentScreen: string;
  navigateTo: (screen: string) => void;
  shouldShowBottomBar: (currentPath: string) => boolean;
};

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

const BOTTOM_BAR_SCREENS = [
  "/(screens)/home",
  "/(screens)/explore",
  "/(screens)/favorites",
  "/(screens)/profile/index",
  "/(screens)/profile",
];

export const NavigationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [currentScreen, setCurrentScreen] = useState("/(screens)/home");

  const navigateTo = useCallback((screen: string) => {
    setCurrentScreen(screen);
    router.push(screen as any);
  }, []);

  const shouldShowBottomBar = useCallback((currentPath: string) => {
    return BOTTOM_BAR_SCREENS.some(
      (screen) =>
        currentPath === screen ||
        (screen.endsWith("/profile") &&
          currentPath === "/(screens)/profile/index")
    );
  }, []);

  return (
    <NavigationContext.Provider
      value={{ currentScreen, navigateTo, shouldShowBottomBar }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};

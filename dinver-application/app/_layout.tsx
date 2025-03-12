import "react-native-get-random-values";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, StyleSheet, Image } from "react-native";
import "react-native-reanimated";
import "../global.css";

import { useColorScheme } from "@/hooks/useColorScheme";
import { AuthProvider } from "../context/AuthContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  const [loaded] = useFonts({
    Degular: require("../assets/fonts/Degular-Regular.otf"),
    "Degular-Medium": require("../assets/fonts/Degular-Medium.otf"),
    "Degular-Bold": require("../assets/fonts/Degular-Bold.otf"),
    "Degular-Semibold": require("../assets/fonts/Degular-Semibold.otf"),
  });

  useEffect(() => {
    if (loaded) {
      setTimeout(() => {
        setIsLoading(false);
        SplashScreen.hideAsync();
      }, 3000);
    }
  }, [loaded]);

  if (!loaded || isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require("../assets/images/logo_text.png")}
          style={styles.logo}
        />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#1E3329",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: "contain",
  },
});

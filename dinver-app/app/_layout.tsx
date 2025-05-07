/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { WebThemeSync } from "@/context/WebThemeSync";
import { View, ActivityIndicator, Platform } from "react-native";
import { useFonts } from "@/hooks/useFonts";
import { initializeToast } from "@/utils/toast";
import Toast, { BaseToast, BaseToastProps, ErrorToast } from 'react-native-toast-message';
import "./globals.css";
import "@/i18n";

const ToastContainerComponent = () => {
  if (Platform.OS === 'web') {
    const { ToastContainer } = require('react-toastify');
    require('react-toastify/dist/ReactToastify.css');
    
    return (
      <ToastContainer
        position="top-center"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ zIndex: 9999 }}
      />
    );
  }
  return null;
};

const toastConfig = {
  success: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#10B981' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '500' }}
      text2Style={{ fontSize: 13 }}
    />
  ),
  error: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#EF4444' }}
      text1Style={{ fontSize: 15, fontWeight: '500' }}
      text2Style={{ fontSize: 13 }}
    />
  ),
  info: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#3B82F6' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '500' }}
      text2Style={{ fontSize: 13 }}
    />
  ),
  warning: (props: React.JSX.IntrinsicAttributes & BaseToastProps) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#F59E0B' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '500' }}
      text2Style={{ fontSize: 13 }}
    />
  )
};

function RootLayoutContent() {
  const { colors, isDark } = useTheme();
  const statusBarStyle = isDark ? "light" : "dark";
  const fontsLoaded = useFonts();

  React.useEffect(() => {
    initializeToast();
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.appPrimary} />
      </View>
    );
  }

  return (
    <>
      <WebThemeSync />
      <StatusBar style={statusBarStyle} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="(screens)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      <ToastContainerComponent />
      <Toast config={toastConfig} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <RootLayoutContent />
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

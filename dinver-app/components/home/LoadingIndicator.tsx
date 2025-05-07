/* eslint-disable react/display-name */
import { useTheme } from "@/context/ThemeContext";
import React, { memo } from "react";
import { ActivityIndicator } from "react-native";

interface LoadingIndicatorProps {
  size?: "small" | "large";
  style?: any;
}

const LoadingIndicator = memo(({ size = "small", style }: LoadingIndicatorProps) => {
  const { colors } = useTheme();
  return (
    <ActivityIndicator size={size} color={colors.appPrimary} style={style} />
  );
});

export default LoadingIndicator;
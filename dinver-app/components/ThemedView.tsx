import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { View, type ViewProps } from "react-native";

type ThemedViewProps = ViewProps & {
  className?: string;
};

export function ThemedView({ className = "", style, ...props }: ThemedViewProps) {
  const { colors } = useTheme();
  
  return (
    <View
      className={`${className}`}
      style={[
        { backgroundColor: colors.background },
        style
      ]}
      {...props}
    />
  );
}

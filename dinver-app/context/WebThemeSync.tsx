import { useEffect } from "react";
import { Platform } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export function WebThemeSync() {
  const { theme } = useTheme();
  
  useEffect(() => {
    if (Platform.OS === "web") {
      if (theme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }
  }, [theme]);
  
  return null;
}

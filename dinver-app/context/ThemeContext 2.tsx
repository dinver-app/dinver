import { Colors } from "@/constants/colors";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";

export type ThemeType = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeType;
  colors: typeof Colors.light | typeof Colors.dark;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemTheme = (Appearance.getColorScheme() as "light" | "dark") || "dark";
  const [themePreference, setThemePreference] = useState<ThemeType>("system");
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">(systemTheme);
  
  const colors = activeTheme === "dark" ? Colors.dark : Colors.light;
  const isDark = activeTheme === "dark";
  
  const toggleTheme = () => {
    setThemePreference(prev => {
      if (prev === "system") return activeTheme === "dark" ? "light" : "dark";
      return prev === "dark" ? "light" : "dark";
    });
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemePreference(newTheme);
  };

  useEffect(() => {
    if (themePreference === "system") {
      setActiveTheme(systemTheme);
    } else {
      setActiveTheme(themePreference as "light" | "dark");
    }
  }, [themePreference, systemTheme]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme && themePreference === "system") {
        setActiveTheme(colorScheme as "light" | "dark");
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [themePreference]);
  
  return (
    <ThemeContext.Provider 
      value={{ 
        theme: themePreference, 
        colors, 
        isDark, 
        toggleTheme,
        setTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = function() {
  const context = useContext(ThemeContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};

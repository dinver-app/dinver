import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

interface ThemeSelectorProps {
  isVisible: boolean;
  onClose: () => void;
  containerClassName?: string;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  isVisible,
  onClose,
  containerClassName,
}) => {
  const { t } = useTranslation();
  const { theme, setTheme, colors } = useTheme();

  const handleThemeChange = (selectedTheme: "light" | "dark" | "system") => {
    setTheme(selectedTheme);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={onClose}
        className="bg-black/50 flex justify-center items-center"
      >
        <View
          style={{ backgroundColor: colors.cardBackground }}
          className={`rounded-[16px] p-[20px] w-[80%] ${
            containerClassName || ""
          }`}
        >
          <Text
            style={{ color: colors.textPrimary }}
            className="font-degular-medium text-[18px] leading-[28px] mb-[16px] pb-2"
          >
            {t("settings.theme", "Theme")}
          </Text>

          <TouchableOpacity
            className="py-[12px] flex-row justify-between items-center"
            onPress={() => handleThemeChange("light")}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="sunny-outline"
                size={20}
                color={colors.textPrimary}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{ color: colors.textPrimary }}
                className="font-degular"
              >
                {t("settings.light", "Light")}
              </Text>
            </View>
            {theme === "light" && (
              <View
                style={{ backgroundColor: colors.appPrimary }}
                className="w-[16px] h-[16px] rounded-full"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="py-[12px] flex-row justify-between items-center"
            onPress={() => handleThemeChange("dark")}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="moon-outline"
                size={20}
                color={colors.textPrimary}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{ color: colors.textPrimary }}
                className="font-degular"
              >
                {t("settings.dark", "Dark")}
              </Text>
            </View>
            {theme === "dark" && (
              <View
                style={{ backgroundColor: colors.appPrimary }}
                className="w-[16px] h-[16px] rounded-full"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="py-[12px] flex-row justify-between items-center"
            onPress={() => handleThemeChange("system")}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="settings-outline"
                size={20}
                color={colors.textPrimary}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{ color: colors.textPrimary }}
                className="font-degular"
              >
                {t("settings.system", "System Default")}
              </Text>
            </View>
            {theme === "system" && (
              <View
                style={{ backgroundColor: colors.appPrimary }}
                className="w-[16px] h-[16px] rounded-full"
              />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default ThemeSelector;

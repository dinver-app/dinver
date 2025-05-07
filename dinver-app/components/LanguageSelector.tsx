import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";

interface LanguageSelectorProps {
  isVisible: boolean;
  onClose: () => void;
  containerClassName?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  isVisible,
  onClose,
  containerClassName,
}) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { colors } = useTheme();

  const handleLanguageChange = async (language: string) => {
    await changeLanguage(language);
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
            {t("common.language", "Language")}
          </Text>

          <TouchableOpacity
            className="py-[12px] flex-row justify-between items-center"
            onPress={() => handleLanguageChange("en")}
          >
            <Text
              style={{ color: colors.textPrimary }}
              className="font-degular"
            >
              {t("profile.english", "English")}
            </Text>
            {currentLanguage === "en" && (
              <View
                style={{ backgroundColor: colors.appPrimary }}
                className="w-[16px] h-[16px] rounded-full"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="py-[12px] flex-row justify-between items-center"
            onPress={() => handleLanguageChange("hr")}
          >
            <Text
              style={{ color: colors.textPrimary }}
              className="font-degular"
            >
              {t("profile.croatian", "Hrvatski")}
            </Text>
            {currentLanguage === "hr" && (
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

export default LanguageSelector;

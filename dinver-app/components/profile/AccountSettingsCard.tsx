/* eslint-disable import/no-named-as-default */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { View, Text, TouchableOpacity, Alert } from "react-native";
import React, { useState } from "react";
import {
  LanguageIcon,
  HelpSupportIcon,
  SignOutIcon,
  ArrowRightIcon,
} from "@/assets/icons/icons";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from "react-i18next";
import { logout } from "@/services/authService";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import LanguageSelector from "@/components/LanguageSelector";

const AccountSettingsCard = () => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const router = useRouter();
  const { setUser } = useAuth();
  const { colors } = useTheme();
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      router.push("/");
    } catch (error) {
      Alert.alert(t("common.error"), t("auth.logoutError"));
    }
  };

  const renderLanguageText = () => {
    return currentLanguage === "en"
      ? t("profile.english")
      : t("profile.croatian");
  };

  return (
    <View
      style={{ backgroundColor: colors.cardBackground }}
      className="rounded-[16px] p-[16px]"
    >
      <View className="mb-[16px]">
        <Text
          style={{ color: colors.textPrimary }}
          className="font-degular-medium text-[18px] leading-[28px]"
        >
          {t("profile.accountSettings")}
        </Text>
      </View>

      <TouchableOpacity
        className="flex-row items-center justify-between py-[12px]"
        onPress={() => setIsLanguageModalVisible(true)}
      >
        <View className="flex-row items-center">
          <LanguageIcon color="#9CA3AF" />
          <Text
            style={{ color: colors.textPrimary }}
            className="font-degular ml-[12px]"
          >
            {t("common.language")}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text
            style={{ color: colors.textSecondary }}
            className="font-degular mr-[8px]"
          >
            {renderLanguageText()}
          </Text>
          <ArrowRightIcon color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-row items-center justify-between py-[12px]"
        onPress={() => router.push("/profile/faq")}
      >
        <View className="flex-row items-center">
          <HelpSupportIcon />
          <Text
            style={{ color: colors.textPrimary }}
            className="font-degular ml-[12px]"
          >
            {t("profile.helpAndSupport")}
          </Text>
        </View>
        <ArrowRightIcon color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-row items-center justify-center py-[12px] mt-[8px]"
        onPress={handleSignOut}
      >
        <SignOutIcon />
        <Text style={{ color: "#EF4444" }} className="font-degular ml-[8px]">
          {t("profile.signOut")}
        </Text>
      </TouchableOpacity>
      <LanguageSelector
        isVisible={isLanguageModalVisible}
        onClose={() => setIsLanguageModalVisible(false)}
      />
    </View>
  );
};

export default AccountSettingsCard;

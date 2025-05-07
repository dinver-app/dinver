import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { VerificationIcon } from "@/assets/icons/icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";

interface VerificationBannerProps {
  onVerify: () => void;
}

const VerificationBanner: React.FC<VerificationBannerProps> = ({
  onVerify,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onVerify}
      activeOpacity={0.9}
      className="rounded-[16px] p-[12px] flex-row items-center justify-between"
      style={{ backgroundColor: colors.cardSecondaryBackground }}
    >
      <View className="flex-row items-center">
        <VerificationIcon />
        <Text
          className="ml-[8px] text-[14px] font-degular"
          style={{ color: colors.textPrimary }}
        >
          {t(
            "profile.completeVerification",
            "Complete your profile verification"
          )}
        </Text>
      </View>
      <Text
        className="text-[14px] font-degular"
        style={{ color: colors.appPrimary }}
      >
        {t("profile.verifyNow", "Verify Now")}
      </Text>
    </TouchableOpacity>
  );
};

export default VerificationBanner;

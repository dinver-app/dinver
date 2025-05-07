import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { ArrowRightIcon } from "@/assets/icons/icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";

const ReservationsCard = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      className="rounded-[16px] p-[16px]"
      style={{ backgroundColor: colors.cardBackground }}
    >
      <View className="flex-row items-center justify-between mb-[16px]">
        <Text
          className="font-degular-medium text-[18px] leading-[28px]"
          style={{ color: colors.textPrimary }}
        >
          {t("profile.yourReservations", "Your Reservations")}
        </Text>
        <TouchableOpacity className="flex-row items-center">
          <Text
            className="font-degular text-[14px] leading-[20px] mr-[8px]"
            style={{ color: colors.appPrimary }}
          >
            {t("common.seeAll", "See All")}
          </Text>
          <ArrowRightIcon color="#0B6958" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ReservationsCard;

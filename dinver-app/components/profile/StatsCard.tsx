import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  StarIcon,
  HeartIcon,
  CalendarIcon,
  CoinIcon,
} from "@/assets/icons/icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  onPress: () => void;
}

const StatItem: React.FC<StatItemProps> = React.memo(
  ({ icon, value, label, onPress }) => {
    const { colors } = useTheme();

    return (
      <TouchableOpacity
        className="items-center justify-center flex-1"
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View
          className="items-center justify-center w-[48px] h-[48px] rounded-full mb-[8px]"
          style={{ backgroundColor: colors.cardSecondaryBackground }}
        >
          {icon}
        </View>
        <Text
          className="font-degular-semibold text-[18px] leading-[28px] text-center"
          style={{ color: colors.textPrimary }}
        >
          {value}
        </Text>
        <Text
          className="font-degular text-[12px] leading-[16px] text-center"
          style={{ color: colors.textSecondary }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }
);

interface StatsCardProps {
  reviews?: number;
  favorites?: number;
  reservations?: number;
  points?: number;
}

const StatsCard: React.FC<StatsCardProps> = ({
  reviews = 12,
  favorites = 8,
  reservations = 5,
  points = 350,
}) => {
  const handlePress = (category: string) => {
    console.log(`${category} pressed`);
  };
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      className="rounded-[16px] p-[16px]"
      style={{ backgroundColor: colors.cardBackground }}
    >
      <Text
        className="font-degular-medium text-[18px] leading-[28px] mb-[16px]"
        style={{ color: colors.textPrimary }}
      >
        {t("profile.yourStats")}
      </Text>
      <View className="flex-row px-[8px]">
        <StatItem
          icon={<StarIcon color="#0B6958" size={22} />}
          value={reviews}
          label={t("profile.reviews")}
          onPress={() => handlePress(t("profile.reviews"))}
        />
        <StatItem
          icon={<HeartIcon color="#0B6958" size={22} />}
          value={favorites}
          label={t("profile.favorites")}
          onPress={() => handlePress(t("profile.favorites"))}
        />
        <StatItem
          icon={<CalendarIcon color="#0B6958" size={22} />}
          value={reservations}
          label={t("profile.reservations")}
          onPress={() => handlePress(t("profile.reservations"))}
        />
        <StatItem
          icon={<CoinIcon color="#0B6958" size={22} />}
          value={points}
          label={t("profile.points")}
          onPress={() => handlePress(t("profile.points"))}
        />
      </View>
    </View>
  );
};

export default React.memo(StatsCard);

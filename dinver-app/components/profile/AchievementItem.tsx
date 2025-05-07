import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface AchievementItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  progress: number;
  threshold: number;
}

const AchievementItem = ({
  icon,
  title,
  description,
  progress,
  threshold,
}: AchievementItemProps) => {
  const { colors } = useTheme();
  const progressPercentage = Math.min(100, (progress / threshold) * 100);

  return (
    <View
      className="rounded-[16px] p-[16px] mb-[16px]"
      style={{ backgroundColor: colors.achievementCard }}
    >
      <View className="flex-row items-center">
        <View
          className="w-[48px] h-[48px] rounded-full items-center justify-center mr-[16px]"
          style={{ backgroundColor: colors.iconBacground }}
        >
          {icon}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text
              className="font-degular-semibold text-lg"
              style={{ color: colors.textPrimary }}
            >
              {title}
            </Text>
            <Text
              className="font-degular text-base"
              style={{ color: colors.appPrimary }}
            >
              {progress}/{threshold}
            </Text>
          </View>
          <Text
            className="font-degular text-base mb-[12px]"
            style={{ color: colors.textSecondary }}
          >
            {description}
          </Text>
          <View
            className="h-[8px] rounded-full overflow-hidden "
            style={{ backgroundColor: colors.achievementProgressTrack }}
          >
            <View
              className="h-full rounded-full"
              style={{
                backgroundColor: colors.achievementProgress,
                width: `${progressPercentage}%`,
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default React.memo(AchievementItem);

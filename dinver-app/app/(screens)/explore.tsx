/* eslint-disable react-hooks/rules-of-hooks */
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";

export default function favorites() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <ThemedView className="flex-1 justify-center items-center">
      
    </ThemedView>
  );
}

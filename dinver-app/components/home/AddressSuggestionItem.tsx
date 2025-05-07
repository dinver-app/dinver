/* eslint-disable react/display-name */
import { PlaceSuggestion } from "@/components/search/LocationSearchBar";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

interface AddressSuggestionItemProps {
  item: PlaceSuggestion;
  onSelect: (suggestion: PlaceSuggestion) => void;
}

const AddressSuggestionItem = memo(
  ({ item, onSelect }: AddressSuggestionItemProps) => {
    const { t } = useTranslation();
    const { colors } = useTheme();

    return (
      <TouchableOpacity
        style={{ borderBottomColor: colors.border }}
        className="p-4 border-b"
        onPress={() => onSelect(item)}
        accessible={true}
        accessibilityLabel={
          t("explore.selectAddress", "Select address: ") + item.description
        }
      >
        <View className="flex-row items-center">
          <Ionicons
            name="location-outline"
            size={20}
            color={colors.appPrimary}
          />
          <Text style={{ color: colors.textPrimary }} className="ml-2" numberOfLines={1}>
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
);

export default AddressSuggestionItem;
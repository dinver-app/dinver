import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";

const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "";
const GOOGLE_PLACES_AUTOCOMPLETE_URL =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_AUTOCOMPLETE_URL ||
  "https://maps.googleapis.com/maps/api/place/autocomplete/json";

export interface PlaceSuggestion {
  id: string;
  description: string;
  placeId: string;
}

interface LocationSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  isSearching: boolean;
  placeholder?: string;
}

const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  isSearching,
  placeholder,
}) => {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      width: "100%",
    },
    searchContainer: {
      flexDirection: "row",
      justifyContent: "center",
      backgroundColor:
        theme === "dark" ? colors.cardBackground : colors.cardBackground,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: "center",
      width: "100%",
    },
    input: {
      flex: 1,
      color: colors.textPrimary,
    },
    icon: {
      marginRight: 8,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#71717a" style={styles.icon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={
            placeholder ||
            t("explore.searchForAddress", "Search for an address")
          }
          placeholderTextColor="#8b8b8b"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isSearching ? (
          <ActivityIndicator size="small" color={colors.appPrimary} />
        ) : (
          value.length > 0 && (
            <TouchableOpacity
              onPress={onClear}
              accessibilityLabel={t("common.clear", "Clear search")}
            >
              <Ionicons name="close-circle" size={20} color="#8b8b8b" />
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
};

export const searchGooglePlaces = async (
  query: string,
  language: string = "hr"
): Promise<PlaceSuggestion[]> => {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery || trimmedQuery.length < 3) return [];

  try {
    const { data } = await axios.get(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
      params: {
        input: trimmedQuery,
        key: GOOGLE_PLACES_API_KEY,
        types: "address",
        language, // Koristimo odabrani jezik aplikacije
        components: "country:hr",
      },
    });
    return (
      data?.predictions?.map((prediction: any) => ({
        id: prediction.place_id,
        description: prediction.description,
        placeId: prediction.place_id,
      })) || []
    );
  } catch (error) {
    console.error("Error fetching place suggestions:", error);
    return [];
  }
};
export default LocationSearchBar;

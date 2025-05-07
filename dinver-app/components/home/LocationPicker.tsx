import {
  FilterHomeIcon,
  LocationHomeIcon,
  SortHomeIcon,
} from "@/assets/icons/icons";
import LocationSearchBar, {
  PlaceSuggestion,
} from "@/components/search/LocationSearchBar";
import { useTheme } from "@/context/ThemeContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useLocation } from "@/hooks/useLocation";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface LocationPickerProps {
  onFilterPress?: () => void;
  onSortPress?: () => void;
}

const LoadingIndicator = ({
  size = "small",
  style,
}: {
  size?: "small" | "large";
  style?: any;
}) => {
  const { colors } = useTheme();
  return (
    <ActivityIndicator size={size} color={colors.appPrimary} style={style} />
  );
};

const AddressSuggestionItem = ({
  item,
  onSelect,
}: {
  item: PlaceSuggestion;
  onSelect: (suggestion: PlaceSuggestion) => void;
}) => {
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
        <Ionicons name="location-outline" size={20} color={colors.appPrimary} />
        <Text style={{ color: colors.textPrimary }} className="ml-2">
          {item.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const LocationPicker: React.FC<LocationPickerProps> = ({
  onFilterPress,
  onSortPress,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const debouncedAddressSearch = useDebouncedValue(addressSearchQuery, 500);

  const {
    latitude,
    longitude,
    address,
    getCurrentLocation,
    searchAddressSuggestions,
    setLocationFromPlace,
    resetLocation,
  } = useLocation();

  const hasLocation = latitude !== 0 && longitude !== 0;
  const ERROR_COLOR = "#EF4444";

  React.useEffect(() => {
    const fetchAddressSuggestions = async () => {
      if (debouncedAddressSearch.length < 3) {
        setAddressSuggestions([]);
        return;
      }

      setAddressSearching(true);
      try {
        const suggestions = await searchAddressSuggestions(
          debouncedAddressSearch
        );
        setAddressSuggestions(suggestions);
      } catch (error) {
        console.error("Error fetching address suggestions:", error);
      } finally {
        setAddressSearching(false);
      }
    };

    fetchAddressSuggestions();
  }, [debouncedAddressSearch, searchAddressSuggestions]);

  const handleAddressPress = useCallback(() => {
    setAddressModalVisible(true);
  }, []);

  const handleSelectAddress = useCallback(
    (suggestion: PlaceSuggestion) => {
      setLocationFromPlace(suggestion.placeId);
      setAddressModalVisible(false);
      setAddressSearchQuery("");
    },
    [setLocationFromPlace]
  );

  const handleRefreshLocation = useCallback(async () => {
    setGettingCurrentLocation(true);

    try {
      const result = await getCurrentLocation();
      if (result) {
        setAddressModalVisible(false);
        setAddressSearchQuery("");
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert(
        t("home.locationError", "Location Error"),
        t(
          "home.locationErrorMessage",
          "Couldn't access your location. Please check your device settings and try again."
        )
      );
    } finally {
      setGettingCurrentLocation(false);
    }
  }, [getCurrentLocation, t]);

  const handleClearLocation = useCallback(() => {
    resetLocation();
    setAddressModalVisible(false);
    setAddressSearchQuery("");
  }, [resetLocation]);

  const renderAddressModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={addressModalVisible}
      onRequestClose={() => setAddressModalVisible(false)}
    >
      <View
        style={{ backgroundColor: colors.background }}
        className="flex-1 mt-10 rounded-t-[20px]"
      >
        <View
          style={{ borderBottomColor: colors.border }}
          className="px-4 py-4 border-b"
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text
              style={{ color: colors.textPrimary }}
              className="text-xl font-bold"
            >
              {t("home.selectLocation", "Select Location")}
            </Text>
            <TouchableOpacity
              onPress={() => setAddressModalVisible(false)}
              accessibilityLabel={t("common.close", "Close")}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <LocationSearchBar
            value={addressSearchQuery}
            onChangeText={setAddressSearchQuery}
            onClear={() => setAddressSearchQuery("")}
            isSearching={addressSearching}
            placeholder={t("home.searchForAddress", "Search for an address")}
          />
          <View className="mt-4 flex-row justify-between">
            <TouchableOpacity
              disabled={gettingCurrentLocation}
              className={`flex-row items-center ${
                gettingCurrentLocation ? "opacity-70" : ""
              }`}
              onPress={handleRefreshLocation}
              accessibilityLabel={t(
                "home.useCurrentLocation",
                "Use current location"
              )}
            >
              {gettingCurrentLocation ? (
                <LoadingIndicator size="small" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="locate" size={24} color={colors.appPrimary} />
              )}
              <Text
                style={{ color: colors.appPrimary }}
                className="ml-2 font-medium"
              >
                {gettingCurrentLocation
                  ? t("home.gettingLocation", "Getting location...")
                  : t("home.useCurrentLocation", "Use current location")}
              </Text>
            </TouchableOpacity>

            {hasLocation && (
              <TouchableOpacity
                className="flex-row items-center"
                onPress={handleClearLocation}
                accessibilityLabel={t(
                  "home.removeLocation",
                  "Remove saved location"
                )}
              >
                <Ionicons name="trash-outline" size={20} color={ERROR_COLOR} />
                <Text
                  style={{ color: ERROR_COLOR }}
                  className="ml-2 font-medium"
                >
                  {t("home.removeLocation", "Remove location")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={addressSuggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AddressSuggestionItem item={item} onSelect={handleSelectAddress} />
          )}
          ListEmptyComponent={
            addressSearchQuery.length > 2 ? (
              <View className="p-4 items-center">
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-center"
                >
                  {t("home.noAddressesFound", "No addresses found")}
                </Text>
              </View>
            ) : (
              <View className="p-4">
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-center"
                >
                  {t(
                    "home.typeAtLeast3Chars",
                    "Type at least 3 characters to search for locations"
                  )}
                </Text>
              </View>
            )
          }
        />
      </View>
    </Modal>
  );

  return (
    <View className="mt-2">
      <TouchableOpacity
        onPress={handleAddressPress}
        className="flex-row items-center mb-4"
      >
        <LocationHomeIcon color={colors.appPrimary} />
        <Text
          style={{ color: colors.textPrimary }}
          className="ml-2 text-base"
          numberOfLines={1}
        >
          {hasLocation
            ? address
            : t("home.tapToSetLocation", "Tap to set your location")}
        </Text>
      </TouchableOpacity>

      <View className="flex-row justify-between items-center mb-4">
        <TouchableOpacity
          onPress={handleAddressPress}
          style={{ backgroundColor: colors.cardBackground }}
          className="px-4 py-2 rounded-full flex-row items-center mr-4"
        >
          <LocationHomeIcon color={colors.appPrimary} />
          <Text style={{ color: colors.textPrimary }} className="ml-2">
            Location
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onFilterPress}
          style={{ backgroundColor: colors.cardBackground }}
          className="px-4 py-2 rounded-full flex-row items-center mr-4"
        >
          <FilterHomeIcon color={colors.appPrimary} />
          <Text style={{ color: colors.textPrimary }} className="ml-2">
            Filter
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSortPress}
          style={{ backgroundColor: colors.cardBackground }}
          className="px-4 py-2 rounded-full flex-row items-center"
        >
          <SortHomeIcon color={colors.appPrimary} />
          <Text style={{ color: colors.textPrimary }} className="ml-2">
            Sort
          </Text>
        </TouchableOpacity>
      </View>

      {renderAddressModal()}
    </View>
  );
};

export default LocationPicker;

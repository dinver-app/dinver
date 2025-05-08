/* eslint-disable react/display-name */
import LocationSearchBar, {
  PlaceSuggestion,
} from "@/components/search/LocationSearchBar";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LoadingIndicator from "@/components/home/LoadingIndicator";

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  addressSearchQuery: string;
  setAddressSearchQuery: (query: string) => void;
  addressSearching: boolean;
  addressSuggestions: PlaceSuggestion[];
  handleSelectAddress: (suggestion: PlaceSuggestion) => void;
  hasLocation: boolean;
  gettingCurrentLocation: boolean;
  handleRefreshLocation: () => Promise<void>;
  handleClearLocation: () => void;
  colors: Record<string, string>;
}

const AddressSuggestionItem = ({
  item,
  onSelect,
  colors,
}: {
  item: PlaceSuggestion;
  onSelect: (suggestion: PlaceSuggestion) => void;
  colors: Record<string, string>;
}) => {
  const { t } = useTranslation();

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

const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  addressSearchQuery,
  setAddressSearchQuery,
  addressSearching,
  addressSuggestions,
  handleSelectAddress,
  hasLocation,
  gettingCurrentLocation,
  handleRefreshLocation,
  handleClearLocation,
  colors,
}) => {
  const { t } = useTranslation();
  const ERROR_COLOR = "#EF4444";

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        style={{
          backgroundColor: "rgba(0,0,0,0.5)",
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />
      <View className="flex-1 justify-end">
        <SafeAreaView
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            flex: 1,
            transform: [{ translateY: 0 }],
          }}
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
                {t("explore.selectLocation", "Select Location")}
              </Text>
              <TouchableOpacity
                onPress={onClose}
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
              placeholder={t(
                "explore.searchForAddress",
                "Search for an address"
              )}
            />
            <View className="mt-4 flex-row justify-between">
              <TouchableOpacity
                disabled={gettingCurrentLocation}
                className={`flex-row items-center ${
                  gettingCurrentLocation ? "opacity-70" : ""
                }`}
                onPress={handleRefreshLocation}
                accessibilityLabel={t(
                  "explore.useCurrentLocation",
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
                    ? t("explore.gettingLocation", "Getting location...")
                    : t("explore.useCurrentLocation", "Use current location")}
                </Text>
              </TouchableOpacity>

              {hasLocation && (
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={handleClearLocation}
                  accessibilityLabel={t(
                    "explore.removeLocation",
                    "Remove location"
                  )}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={ERROR_COLOR}
                  />
                  <Text
                    style={{ color: ERROR_COLOR }}
                    className="ml-2 font-medium"
                  >
                    {t("explore.removeLocation", "Remove location")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={addressSuggestions}
            keyExtractor={(item) => item.id || item.placeId}
            renderItem={({ item }) => (
              <AddressSuggestionItem
                item={item}
                onSelect={handleSelectAddress}
                colors={colors}
              />
            )}
            ListEmptyComponent={
              addressSearchQuery.length > 2 ? (
                <View className="p-4 items-center">
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="text-center"
                  >
                    {t("explore.noAddressesFound", "No addresses found")}
                  </Text>
                </View>
              ) : (
                <View className="p-4">
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="text-center"
                  >
                    {t(
                      "explore.typeAtLeast3Chars",
                      "Type at least 3 characters to search for locations"
                    )}
                  </Text>
                </View>
              )
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default LocationModal;

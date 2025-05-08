/* eslint-disable react-hooks/exhaustive-deps */
import {
  FilterHomeIcon,
  LocationHomeIcon,
  SortHomeIcon,
} from "@/assets/icons/icons";
import { PlaceSuggestion } from "@/components/search/LocationSearchBar";
import SearchBar from "@/components/search/SearchBar";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/context/ThemeContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useLocation } from "@/hooks/useLocation";
import { useResponsive } from "@/hooks/useResponsive";
import { useRestaurants } from "@/hooks/useRestaurants";
import { LocationParams, Restaurant } from "@/services/restaurantService";
import { saveSearchTerm } from "@/services/userService";
import { Ionicons } from "@expo/vector-icons";
import Octicons from "@expo/vector-icons/Octicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import FilterItem from "@/components/home/FilterItem";
import LoadingIndicator from "@/components/home/LoadingIndicator";
import LocationModal from "@/components/home/LocationModal";
import RestaurantsList from "@/components/home/RestaurantsList";
import SpecialOffersList from "@/components/home/SpecialOffersList";

export default function HomeScreen() {
  const { t } = useTranslation();
  const { numColumns } = useResponsive();
  const { colors } = useTheme();
  const [searchInputValue, setSearchInputValue] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchInputValue, 200);

  const {
    latitude,
    longitude,
    address,
    error: locationError,
    getCurrentLocation,
    searchAddressSuggestions,
    setLocationFromPlace,
    resetLocation,
  } = useLocation();

  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const debouncedAddressSearch = useDebouncedValue(addressSearchQuery, 500);

  const locationParams: LocationParams = { latitude, longitude };
  const {
    restaurants,
    loading,
    loadingMore,
    refreshing,
    error,
    handleLoadMore,
    handleRefresh,
  } = useRestaurants(debouncedSearchQuery, locationParams);

  const [specialOffers, setSpecialOffers] = useState<Restaurant[]>([]);

  const hasLocation = latitude !== 0 && longitude !== 0;
  const hasError = !!error || !!locationError;
  const errorMessage = error || locationError;
  const isInitialLoading = loading && !refreshing && restaurants.length === 0;

  useEffect(() => {
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

  useEffect(() => {
    if (!restaurants?.length) {
      setSpecialOffers([]);
      return;
    }

    const offers = restaurants
      .filter((r) => r.thumbnailUrl)
      .slice(0, Math.min(5, restaurants.length));
    setSpecialOffers(offers);
  }, [restaurants]);

  const handleSearchInputChange = useCallback((text: string) => {
    setSearchInputValue(text);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchInputValue("");
  }, []);

  useEffect(() => {
    const saveSearch = async () => {
      if (debouncedSearchQuery && debouncedSearchQuery.trim().length >= 2) {
        await saveSearchTerm(debouncedSearchQuery);
      }
    };

    saveSearch();
  }, [debouncedSearchQuery]);

  const handleSelectSearchHistory = useCallback((term: string) => {
    setSearchInputValue(term);
  }, []);

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
        t("explore.locationError", "Location Error"),
        t(
          "explore.locationErrorMessage",
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

  const renderLoadingState = () => (
    <ThemedView className="flex-1 justify-center items-center">
      <LoadingIndicator size="large" />
      <Text className="mt-4" style={{ color: colors.textSecondary }}>
        {t("explore.loadingRestaurants", "Loading restaurants...")}
      </Text>
    </ThemedView>
  );

  const renderLocationSelection = () => (
    <ThemedView
      style={{ backgroundColor: colors.cardBackground }}
      className="justify-center items-center py-8 mx-4 mt-6 rounded-2xl"
    >
      <Ionicons name="location-outline" size={60} color={colors.appPrimary} />
      <Text
        style={{ color: colors.textPrimary }}
        className="text-xl font-degular-bold text-center mt-4 px-6"
      >
        {t(
          "explore.setLocationToDiscover",
          "Set your location to discover restaurants"
        )}
      </Text>
      <Text
        style={{ color: colors.textSecondary }}
        className="text-center mt-3 mb-6 px-8"
      >
        {t(
          "explore.findRestaurantsNearYou",
          "Find restaurants near you or search for restaurants in a specific area"
        )}
      </Text>

      <View className="flex-col w-full px-8 items-center">
        <TouchableOpacity
          disabled={gettingCurrentLocation}
          style={{ backgroundColor: colors.appPrimary }}
          className={`w-[240px] py-3 rounded-full flex-row items-center justify-center mb-4 ${
            gettingCurrentLocation ? "opacity-70" : ""
          }`}
          onPress={handleRefreshLocation}
          accessibilityLabel={t(
            "explore.useMyLocation",
            "Use my current location"
          )}
        >
          {gettingCurrentLocation ? (
            <LoadingIndicator size="small" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons
              name="locate"
              size={18}
              color="white"
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={{ color: "white" }} className="font-degular-bold">
            {gettingCurrentLocation
              ? t("explore.gettingLocation", "Getting location...")
              : t("explore.useMyLocation", "Use My Location")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "transparent",
            borderColor: colors.appPrimary,
          }}
          className="w-[240px] py-3 rounded-full border flex-row items-center justify-center"
          onPress={handleAddressPress}
          accessibilityLabel={t(
            "explore.searchLocation",
            "Search for location"
          )}
        >
          <Ionicons
            name="search"
            size={18}
            color={colors.textPrimary}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{ color: colors.textPrimary }}
            className="font-degular-bold"
          >
            {t("explore.searchLocation", "Search Location")}
          </Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  const renderEmptyRestaurants = () => {
    if (loading) return null;
    if (!hasLocation) return renderLocationSelection();

    return (
      <ThemedView className="justify-center items-center py-8">
        {debouncedSearchQuery ? (
          <View className="items-center">
            <Ionicons
              name="search-outline"
              size={44}
              color={colors.textSecondary}
            />
            <Text
              style={{ color: colors.textPrimary }}
              className="text-lg text-center mt-4"
            >
              {t("explore.noResultFor", "No result for")} {debouncedSearchQuery}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.input }}
              className="mt-4 px-4 py-2 rounded-full"
              onPress={handleClearSearch}
              accessibilityLabel={t("explore.clearSearch", "Clear search")}
            >
              <Text
                style={{ color: colors.textPrimary }}
                className="font-medium"
              >
                {t("explore.clearTheSearch", "Clear the search")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="items-center">
            <Ionicons
              name="restaurant-outline"
              size={48}
              color={colors.textSecondary}
            />
            <Text
              style={{ color: colors.textPrimary }}
              className="text-lg text-center mt-4"
            >
              {t("explore.noAvailableRestaurants", "No available restaurants")}
            </Text>
          </View>
        )}
      </ThemedView>
    );
  };

  const renderError = () => (
    <View className="justify-center items-center py-8">
      <Ionicons name="warning-outline" size={48} color={colors.error} />
      <Text style={{ color: "red" }} className="mt-4 mb-4 text-center">
        {errorMessage}
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: colors.input }}
        className="px-6 py-3 rounded-full"
        onPress={handleAddressPress}
        accessibilityLabel={t("explore.changeLocation", "Change location")}
      >
        <Text style={{ color: colors.textPrimary }} className="font-medium">
          {t("explore.changeLocation", "Change Location")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const sections = useMemo(() => {
    const result = [];
    result.push({
      type: "header",
      id: "header",
    });
    if (!hasLocation || (loading && !restaurants.length)) {
      result.push({
        type: "empty",
        id: "empty",
      });
      return result;
    }
    if (hasLocation && !loading) {
      result.push({
        type: "filters",
        id: "filters",
      });
    }
    if (
      hasLocation &&
      !loading &&
      !debouncedSearchQuery &&
      specialOffers.length > 0
    ) {
      result.push({
        type: "specialOffers",
        id: "specialOffers",
        title: t("explore.specialOffers", "Special Offers!"),
      });
    }
    if (hasLocation && restaurants.length > 0) {
      result.push({
        type: "restaurants",
        id: "restaurants",
        title: t("explore.somethingCloseToYou", "Something close to you!"),
      });
    } else if (hasLocation && debouncedSearchQuery) {
      result.push({
        type: "restaurants",
        id: "restaurants",
      });
    }

    return result;
  }, [
    hasLocation,
    loading,
    restaurants.length,
    debouncedSearchQuery,
    specialOffers.length,
    t,
  ]);

  const renderSectionItem = useCallback(
    ({ item }: { item: { type: string; id: string; title?: string } }) => {
      switch (item.type) {
        case "header":
          return (
            <View
              className="border-b-[1px]"
              style={{ borderBottomColor: colors.border, width: "100%" }}
            >
              <View className="p-[16px] flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-[40px] h-[40px] items-center justify-center">
                    <LocationHomeIcon color={colors.icon} />
                  </View>
                  <TouchableOpacity onPress={handleAddressPress}>
                    {hasLocation ? (
                      <Text
                        style={{ color: colors.textSecondary }}
                        className="font-degular-light text-[12px] leading-[16px] w-[240px]"
                        numberOfLines={1}
                      >
                        {address}
                      </Text>
                    ) : (
                      <Text
                        style={{ color: colors.textSecondary }}
                        className="font-degular-light text-[12px] leading-[16px]"
                        numberOfLines={1}
                      >
                        Tap to set your location
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                <View className="flex-row absolute right-[16px]">
                  <TouchableOpacity className="w-[40px] h-[40px] items-center justify-center">
                    <FilterHomeIcon color={colors.icon} />
                  </TouchableOpacity>
                  <TouchableOpacity className="w-[40px] h-[40px] items-center justify-center">
                    <SortHomeIcon color={colors.icon} />
                  </TouchableOpacity>
                </View>
              </View>
              {(hasLocation || loading) && (
                <View className="px-[16px] mb-[12px]">
                  <SearchBar
                    value={searchInputValue}
                    onChangeText={handleSearchInputChange}
                    onClear={handleClearSearch}
                    onSelectSearchHistory={handleSelectSearchHistory}
                    placeholder={t(
                      "explore.findYourRestaurant",
                      "Find your restaurant"
                    )}
                  />
                </View>
              )}
            </View>
          );

        case "empty":
          return renderEmptyRestaurants();

        case "filters":
          return (
            <View className="px-[19px] mt-2">
              <View className="mb-[24px] flex-row py-[8px] justify-around">
                <FilterItem
                  image={require("@/assets/images/burger.jpg")}
                  filterName={t("home.fastFood", "Fast Food")}
                />
                <FilterItem
                  image={require("@/assets/images/pizza.jpg")}
                  filterName={t("home.pizza", "Pizza")}
                />
                <FilterItem
                  image={require("@/assets/images/sushi.jpg")}
                  filterName={t("home.sushi", "Sushi")}
                />
                <FilterItem
                  image={require("@/assets/images/mexican.jpg")}
                  filterName={t("home.mexican", "Mexican")}
                />
                <FilterItem
                  image={require("@/assets/images/healthy.jpg")}
                  filterName={t("home.healthy", "Healthy")}
                />
              </View>
            </View>
          );

        case "specialOffers":
          return (
            <View className="px-[16px] mt-2">
              <View className="flex-row gap-[8px] items-center mb-[12px]">
                <Text
                  style={{ color: colors.textPrimary }}
                  className="font-degular-bold text-[24px]"
                >
                  {item.title}
                </Text>
                <Octicons
                  name="star-fill"
                  color="#F3B200"
                  size={24}
                  className="p-1"
                />
              </View>
              <SpecialOffersList
                loading={loading}
                specialOffers={specialOffers}
                colors={colors}
              />
            </View>
          );

        case "restaurants":
          return (
            <View className="pt-[24px] px-[16px]" style={{ flex: 1 }}>
              {item.title && (
                <Text
                  style={{ color: colors.textPrimary }}
                  className="font-degular-bold text-[24px]"
                >
                  {item.title}
                </Text>
              )}
              <View className="pt-[18px]" style={{ flex: 1 }}>
                {hasError ? (
                  renderError()
                ) : restaurants.length > 0 ? (
                  <RestaurantsList
                    restaurants={restaurants}
                    loading={loading}
                    loadingMore={loadingMore}
                    hasLocation={hasLocation}
                    handleLoadMore={handleLoadMore}
                    numColumns={numColumns}
                    colors={colors}
                  />
                ) : (
                  renderEmptyRestaurants()
                )}
              </View>
            </View>
          );

        default:
          return null;
      }
    },
    [
      colors,
      hasLocation,
      address,
      handleAddressPress,
      loading,
      searchInputValue,
      handleSearchInputChange,
      handleClearSearch,
      handleSelectSearchHistory,
      t,
      specialOffers,
      hasError,
      errorMessage,
      restaurants,
      loadingMore,
      numColumns,
      debouncedSearchQuery,
      handleLoadMore,
    ]
  );

  if (isInitialLoading) {
    return renderLoadingState();
  }

  return (
    <ThemedView className="flex-1">
      <FlatList
        style={{ flex: 1 }}
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderSectionItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.appPrimary]}
            tintColor={colors.appPrimary}
          />
        }
        onEndReached={
          hasLocation && !loadingMore && !loading ? handleLoadMore : undefined
        }
        onEndReachedThreshold={0.5}
        initialNumToRender={4}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      />

      <LocationModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        addressSearchQuery={addressSearchQuery}
        setAddressSearchQuery={setAddressSearchQuery}
        addressSearching={addressSearching}
        addressSuggestions={addressSuggestions}
        handleSelectAddress={handleSelectAddress}
        hasLocation={hasLocation}
        gettingCurrentLocation={gettingCurrentLocation}
        handleRefreshLocation={handleRefreshLocation}
        handleClearLocation={handleClearLocation}
        colors={colors}
      />
    </ThemedView>
  );
}

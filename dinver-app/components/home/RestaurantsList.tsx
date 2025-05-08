/* eslint-disable react/display-name */
import RestaurantCard from "@/components/search/RestaurantCard";
import { Restaurant } from "@/services/restaurantService";
import React, { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Text, View } from "react-native";
import LoadingIndicator from "./LoadingIndicator";

interface RestaurantsListProps {
  restaurants: Restaurant[];
  loading: boolean;
  loadingMore: boolean;
  hasLocation: boolean;
  handleLoadMore: () => void;
  numColumns: number;
  colors: any;
}

const RestaurantsList = memo(
  ({
    restaurants,
    loadingMore,
    handleLoadMore,
    numColumns,
    colors,
  }: RestaurantsListProps) => {
    const { t } = useTranslation();

    const renderItem = useCallback(
      ({ item, index }: { item: Restaurant; index: number }) => (
        <View
          style={{
            width:
              numColumns === 3 ? "33.33%" : numColumns === 2 ? "50%" : "100%",
            paddingHorizontal: 4,
            paddingBottom: 18,
          }}
        >
          <RestaurantCard restaurant={item} index={index} />
        </View>
      ),
      [numColumns]
    );

    const keyExtractor = useCallback(
      (item: Restaurant) => `restaurant-${item.id}`,
      []
    );

    const ListFooterComponent = useCallback(() => {
      if (!loadingMore) return null;

      return (
        <View className="py-4 w-full items-center justify-center">
          <LoadingIndicator size="small" />
          <Text style={{ color: colors.textSecondary }} className="mt-2">
            {t("explore.loadingMoreRestaurants", "Loading more restaurants...")}
          </Text>
        </View>
      );
    }, [loadingMore, colors.textSecondary, t]);

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={restaurants}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          scrollEnabled={false}
          nestedScrollEnabled={false}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={6}
          removeClippedSubviews={true}
          ListFooterComponent={ListFooterComponent}
          updateCellsBatchingPeriod={50}
          onEndReachedThreshold={0.5}
          onEndReached={handleLoadMore}
          contentContainerStyle={{
            paddingHorizontal: 4,
          }}
        />
      </View>
    );
  }
);

export default RestaurantsList;

/* eslint-disable react/display-name */
import SpecialOfferCard from "@/components/search/SpecialOfferCard";
import { Restaurant } from "@/services/restaurantService";
import React, { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, View } from "react-native";
import LoadingIndicator from "./LoadingIndicator";

interface SpecialOffersListProps {
  loading: boolean;
  specialOffers: Restaurant[];
  colors: any;
}

const SpecialOffersList = memo(({ loading, specialOffers }: SpecialOffersListProps) => {
  const { t } = useTranslation();

  const renderItem = useCallback(({ item }: { item: Restaurant; index: number }) => (
    <SpecialOfferCard
      restaurant={item}
      onPress={() => {}}
    />
  ), []);

  const keyExtractor = useCallback((item: Restaurant) => `specialoffer-${item.id}`, []);

  if (loading && !specialOffers.length) {
    return (
      <View className="h-[120px] justify-center items-center">
        <LoadingIndicator size="small" />
      </View>
    );
  }
  
  if (specialOffers.length === 0) {
    return null;
  }

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      className="pt-[8px]"
      data={specialOffers}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{ paddingRight: 12 }}
      initialNumToRender={3}
      maxToRenderPerBatch={2}
      windowSize={3}
      removeClippedSubviews={true}
      updateCellsBatchingPeriod={50}
      snapToAlignment="start"
      decelerationRate="fast"
    />
  );
});

export default SpecialOffersList;
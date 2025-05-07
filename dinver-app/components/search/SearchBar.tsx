/* eslint-disable react/display-name */
import React, { memo, useState, useEffect } from "react";
import { View, TextInput, TouchableOpacity, Text, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { searchInputSchema, SearchHistoryItem } from "@/utils/validation";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";
import { SearchHomeIcon } from "@/assets/icons/icons";
import { getSearchHistory, deleteSearchTerm } from "@/services/userService";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  onSelectSearchHistory?: (term: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = memo(
  ({ value, onChangeText, onClear, placeholder, onSelectSearchHistory }) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const [error, setError] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

    useEffect(() => {
      if (isFocused && !value) {
        loadSearchHistory();
      }
    }, [isFocused, value]);

    const loadSearchHistory = async () => {
      try {
        const history = await getSearchHistory();
        const validHistory = history.filter(
          item => item.searchTerm && item.searchTerm.trim().length > 0
        );
        setSearchHistory(validHistory);
      } catch (error) {
        console.error("Failed to load search history:", error);
        setSearchHistory([]);
      }
    };

    const handleChangeText = (text: string) => {
      try {
        if (!text || text.trim() === '') {
          onChangeText(text);
          setError(null);
          return;
        }

        searchInputSchema.parse(text);
        setError(null);
        onChangeText(text);
      } catch (err) {
        if (err instanceof z.ZodError) {
          setError(err.errors[0].message);
          onChangeText(text);
        }
      }
    };

    const handleSelectHistoryItem = (term: string) => {
      if (!term || term.trim() === '') return;
      
      onChangeText(term);
      if (onSelectSearchHistory) {
        onSelectSearchHistory(term);
      }
      
      // Sakrij rezultate nakon odabira
      setIsFocused(false);
    };

    const handleDeleteHistoryItem = async (term: string) => {
      try {
        await deleteSearchTerm(term);
        // Osvježi prikaz nakon brisanja
        loadSearchHistory();
      } catch (error) {
        console.error("Failed to delete search term:", error);
      }
    };

    // Dodatna provjera da imamo povijesti pretraživanja za prikaz
    const hasValidHistory = searchHistory.length > 0;

    return (
      <View className="w-full">
        <View
          className="flex-row justify-center rounded-[16px] p-[12px] w-full"
          style={{ backgroundColor: colors.cardBackground }}
        >
          <View className="w-[20px] h-[20px] items-center justify-center mr-[8px]">
            <SearchHomeIcon color={colors.textSecondary} />
          </View>
          <TextInput
            className="flex-1 text-[14px]"
            style={{
              color: colors.textPrimary,
              fontFamily: "Inter",
              fontWeight: "500",
            }}
            value={value}
            onChangeText={handleChangeText}
            placeholder={
              placeholder ||
              t("explore.findYourRestaurant", "Find your restaurant")
            }
            placeholderTextColor={colors.textSecondary}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 200);
            }}
            returnKeyType="search"
            autoComplete="off"
            textContentType="none"
            autoCapitalize="none"
            autoCorrect={true}
          />
          {value.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                onClear();
                setError(null);
              }}
              className="ml-[8px] w-[20px] h-[20px] justify-center items-center"
              accessibilityLabel={t("common.clear", "Clear")}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        {error && (
          <Text className="text-xs mt-1 ml-4" style={{ color: colors.error }}>
            {error}
          </Text>
        )}
        
        {isFocused && !value && hasValidHistory && (
          <View 
            className="mt-2 rounded-[10px] py-2 absolute w-full top-[55px] z-10"
            style={{ backgroundColor: colors.cardBackground }}
          >
            <Text 
              className="text-xs mb-1 px-4" 
              style={{ color: colors.textSecondary }}
            >
              {t("explore.recentSearches", "Recent Searches")}
            </Text>
            <FlatList
              data={searchHistory}
              keyExtractor={(item) => `${item.searchTerm}-${item.timestamp}`}
              renderItem={({ item }) => {
                if (!item.searchTerm || item.searchTerm.trim() === '') return null;
                
                return (
                  <View className="flex-row items-center justify-between px-4 py-2">
                    <TouchableOpacity 
                      className="flex-1 flex-row items-center" 
                      onPress={() => handleSelectHistoryItem(item.searchTerm)}
                    >
                      <Ionicons 
                        name="time-outline" 
                        size={16} 
                        color={colors.textSecondary}
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-[14px]" style={{ color: colors.textPrimary }}>
                        {item.searchTerm}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteHistoryItem(item.searchTerm)}
                      className="p-1"
                      accessibilityLabel={t("common.delete", "Delete")}
                    >
                      <Ionicons 
                        name="close" 
                        size={16} 
                        color={colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                );
              }}
              style={{ maxHeight: 200 }}
            />
          </View>
        )}
      </View>
    );
  }
);

export default SearchBar;

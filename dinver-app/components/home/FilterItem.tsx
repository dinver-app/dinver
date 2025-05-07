/* eslint-disable react/display-name */
import { useTheme } from "@/context/ThemeContext";
import React, { memo } from "react";
import { Image, Text, TouchableOpacity } from "react-native";

interface FilterItemProps {
  image: any;
  filterName: string;
  onPress?: () => void;
}

const FilterItem = memo(({ image, filterName, onPress }: FilterItemProps) => {
  const { colors } = useTheme();
  
  return (
    <TouchableOpacity onPress={onPress}>
      <Image
        source={image}
        style={{ width: 56, height: 56, borderRadius: 28 }}
      />
      <Text
        className="mt-[4px] text-[12px] leading-[16px] text-center"
        style={{
          color: colors.textPrimary,
          fontFamily: "Roboto",
          fontWeight: "400",
        }}
      >
        {filterName}
      </Text>
    </TouchableOpacity>
  );
});

export default FilterItem;
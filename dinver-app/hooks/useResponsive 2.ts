import { useWindowDimensions } from "react-native";

export function useResponsive() {
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 640;
  const isMediumScreen = width >= 640 && width < 1024;
  const isLargeScreen = width >= 1024;
  const numColumns = isSmallScreen ? 1 : isMediumScreen ? 2 : 3;

  return {
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    numColumns,
    screenWidth: width,
  };
}

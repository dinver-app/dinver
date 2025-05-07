import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

export function useFonts(): boolean {
  const [fontsLoaded, setFontsLoaded] = useState<boolean>(false);

  useEffect(() => {
    async function loadFonts(): Promise<void> {
      try {
        await Font.loadAsync({
          'Degular-Regular': require('@/assets/fonts/Degular/degular/Degular-Regular.otf'),
          'Degular-Light': require('@/assets/fonts/Degular/degular/Degular-Light.otf'),
          'Degular-Thin': require('@/assets/fonts/Degular/degular/Degular-Thin.otf'),
          'Degular-Bold': require('@/assets/fonts/Degular/degular/Degular-Bold.otf'),
          'Degular-Semibold': require('@/assets/fonts/Degular/degular/Degular-Semibold.otf'),
          'Degular-Black': require('@/assets/fonts/Degular/degular/Degular-Black.otf'),
          'Degular-Medium': require('@/assets/fonts/Degular/degular/Degular-Medium.otf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  return fontsLoaded;
}
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { 
  ArrowRightIcon, 
  CityHopperIcon, 
  EliteReviewerIcon, 
  FoodExplorerIcon, 
  WorldCuisineIcon 
} from '@/assets/icons/icons';
import AchievementItem from './AchievementItem';
import { fetchAchievements, AchievementResponse } from '@/services/achievementService';

const AchievementsCard = () => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<AchievementResponse | null>(null);
  const [error, setError] = useState(false);
  const isMounted = useRef(true);
  const hasAttemptedLoad = useRef(false);
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    const loadAchievements = async () => {
      if (hasAttemptedLoad.current) return;
      
      try {
        hasAttemptedLoad.current = true;
        const data = await fetchAchievements();
        if (isMounted.current) {
          setAchievements(data);
          setError(false);
        }
      } catch (error) {
        console.error("Failed to load achievements:", error);
        if (isMounted.current) {
          setError(true);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    loadAchievements();
  }, []);

  const getLocalizedTitle = (enTitle: string, hrTitle: string) => {
    return i18n.language === 'hr' ? hrTitle : enTitle;
  };
  
  if (loading) {
    return (
      <View className="rounded-[16px] p-4 mb-6" style={{ backgroundColor: colors.cardBackground }}>
        <Text 
          className="text-[18px] font-degular-semibold mb-4"
          style={{ color: colors.textPrimary }}
        >
          {t('profile.achievements', 'Achievements')}
        </Text>
        <ActivityIndicator color={colors.appPrimary} />
      </View>
    );
  }
  
  if (error || !achievements) {
    return (
      <View className="rounded-[16px] p-4 mb-6" style={{ backgroundColor: colors.cardBackground }}>
        <Text 
          className="text-[18px] font-degular-semibold mb-4"
          style={{ color: colors.textPrimary }}
        >
          {t('profile.achievements', 'Achievements')}
        </Text>
        <Text 
          className="text-base mb-2"
          style={{ color: colors.textSecondary }}
        >
          {t('common.error', 'Error')}
        </Text>
        <TouchableOpacity 
          onPress={() => {
            setLoading(true);
            setError(false);
            hasAttemptedLoad.current = false;
            loadAchievements();
          }}
          className="bg-opacity-10 py-2 px-4 rounded-md"
          style={{ backgroundColor: `${colors.appPrimary}20` }}
        >
          <Text style={{ color: colors.appPrimary }}>
            {t('common.tryAgain', 'Try Again')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const { categorySummary, totalAchieved } = achievements;
  
  return (
    <View className="rounded-[16px] px-[16px] pt-[16px]" style={{ backgroundColor: colors.cardBackground }}>
      <View className="flex-row justify-between items-center">
        <Text 
          className="text-[18px] font-degular-semibold"
          style={{ color: colors.textPrimary }}
        >
          {t('profile.achievements', 'Achievements')}
        </Text>
        
        <TouchableOpacity 
          className="flex-row items-center"
          onPress={() => {}}
        >
          <Text 
            className="text-sm"
            style={{ color: colors.appPrimary }}
          >
            {totalAchieved}/30 {t('profile.unlocked', 'Unlocked')}
          </Text>
          <ArrowRightIcon color={colors.appPrimary} />
        </TouchableOpacity>
      </View>
      
      <Text 
        className="text-base mt-[4px] mb-[24px]"
        style={{ color: colors.textSecondary }}
      >
        {t('profile.achievementsSubtitle', 'Keep exploring to unlock more badges!')}
      </Text>
      
      <AchievementItem
        icon={<FoodExplorerIcon size={24} />}
        title={getLocalizedTitle(
          categorySummary.FOOD_EXPLORER.nextLevel.en,
          categorySummary.FOOD_EXPLORER.nextLevel.hr
        )}
        description={t('achievements.visitRestaurants', 'Visit {{count}} different restaurants', { 
          count: categorySummary.FOOD_EXPLORER.nextLevel.threshold 
        })}
        progress={categorySummary.FOOD_EXPLORER.nextLevel.progress}
        threshold={categorySummary.FOOD_EXPLORER.nextLevel.threshold}
      />
      
      <AchievementItem
        icon={<CityHopperIcon size={24} />}
        title={getLocalizedTitle(
          categorySummary.CITY_HOPPER.nextLevel.en,
          categorySummary.CITY_HOPPER.nextLevel.hr
        )}
        description={t('achievements.visitCities', 'Dine in {{count}} different cities', { 
          count: categorySummary.CITY_HOPPER.nextLevel.threshold 
        })}
        progress={categorySummary.CITY_HOPPER.nextLevel.progress}
        threshold={categorySummary.CITY_HOPPER.nextLevel.threshold}
      />
      
      <AchievementItem
        icon={<EliteReviewerIcon size={24} />}
        title={getLocalizedTitle(
          categorySummary.ELITE_REVIEWER.nextLevel.en,
          categorySummary.ELITE_REVIEWER.nextLevel.hr
        )}
        description={t('achievements.writeReviews', 'Write {{count}} quality reviews', { 
          count: categorySummary.ELITE_REVIEWER.nextLevel.threshold 
        })}
        progress={categorySummary.ELITE_REVIEWER.nextLevel.progress}
        threshold={categorySummary.ELITE_REVIEWER.nextLevel.threshold}
      />
      
      <AchievementItem
        icon={<WorldCuisineIcon size={24} />}
        title={getLocalizedTitle(
          categorySummary.WORLD_CUISINE.nextLevel.en,
          categorySummary.WORLD_CUISINE.nextLevel.hr
        )}
        description={t('achievements.tryCuisines', 'Try {{count}} different cuisines', { 
          count: categorySummary.WORLD_CUISINE.nextLevel.threshold 
        })}
        progress={categorySummary.WORLD_CUISINE.nextLevel.progress}
        threshold={categorySummary.WORLD_CUISINE.nextLevel.threshold}
      />
    </View>
  );
  
  // Define the loadAchievements function
  async function loadAchievements() {
    try {
      const data = await fetchAchievements();
      if (isMounted.current) {
        setAchievements(data);
        setError(false);
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to load achievements:", error);
      if (isMounted.current) {
        setError(true);
        setLoading(false);
      }
    }
  }
};

export default React.memo(AchievementsCard);
/* eslint-disable react/display-name */
import {
  EditProfileIcon,
  LocationIcon,
  Logo,
  SettingsIcon,
} from "@/assets/icons/icons";
import AccountSettingsCard from "@/components/profile/AccountSettingsCard";
import AchievementsCard from "@/components/profile/AchievementsCard";
import ReservationsCard from "@/components/profile/ReservationsCard";
import SavedCard from "@/components/profile/SavedCard";
import SignInForm from "@/components/profile/SignInForm";
import SignUpForm from "@/components/profile/SignUpForm";
import StatsCard from "@/components/profile/StatsCard";
import VerificationBanner from "@/components/profile/VerificationBanner";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { logout } from "@/services/authService";
import { getVerificationStatus, getUserProfile } from "@/services/userService";
import { showError } from "@/utils/toast";
import { VerificationStatus } from "@/utils/validation";
import { router, useFocusEffect } from "expo-router";
import React, { memo, useCallback, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  AppState,
  AppStateStatus,
} from "react-native";

const TabButton = memo(
  ({
    active,
    onPress,
    label,
  }: {
    active: boolean;
    onPress: () => void;
    label: string;
  }) => {
    const { t } = useTranslation();
    const { colors } = useTheme();

    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          height: 47,
          borderBottomWidth: active ? 2 : 1,
          borderBottomColor: active ? "#2A9D8F" : colors.border,
        }}
        className="flex-1 items-center justify-center"
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text
          style={{
            fontFamily: "Roboto",
            color: active ? colors.textPrimary : colors.textSecondary,
          }}
          className="font-normal text-sm"
        >
          {t(label)}
        </Text>
      </TouchableOpacity>
    );
  }
);

const AuthScreen = memo(
  ({
    showSignUp,
    setShowSignUp,
  }: {
    showSignUp: boolean;
    setShowSignUp: (show: boolean) => void;
  }) => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <SafeAreaView className="flex-1 items-center">
            <View className="w-full items-center justify-center">
              <TouchableOpacity
                activeOpacity={1}
                onPress={Keyboard.dismiss}
                className="py-[53.5px]"
              >
                <Logo />
              </TouchableOpacity>
              <View className="w-full flex-row justify-center mb-6">
                <TabButton
                  active={!showSignUp}
                  onPress={() => setShowSignUp(false)}
                  label="common.signIn"
                />
                <TabButton
                  active={showSignUp}
                  onPress={() => setShowSignUp(true)}
                  label="common.signUp"
                />
              </View>
              {showSignUp ? (
                <SignUpForm onSuccess={() => setShowSignUp(false)} />
              ) : (
                <SignInForm
                  onCreateAccount={() => setShowSignUp(true)}
                  onForgotPassword={() =>
                    Alert.alert(
                      "Forgot Password",
                      "Forgot password functionality not implemented yet."
                    )
                  }
                />
              )}
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
);

const ProfileContent = memo(
  ({ user }: { user: any; handleLogout: () => Promise<void> }) => {
    const [verificationStatus, setVerificationStatus] =
      useState<VerificationStatus>({
        isEmailVerified: false,
        isPhoneVerified: false,
      });
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState(user);
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { setUser } = useAuth();
    const isInitialMount = useRef(true);
    const isLoadingRef = useRef(false);
    const lastUpdateRef = useRef(Date.now());
    const verificationCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const appStateRef = useRef(AppState.currentState);
    const isPollingActiveRef = useRef(false);
    const lastVerificationCheckRef = useRef<number>(0);
    const prevVerificationStatusRef = useRef<VerificationStatus | null>(null);
    const checkVerificationStatus = useCallback(async () => {
      const now = Date.now();
      if (now - lastVerificationCheckRef.current < 3000) return;

      lastVerificationCheckRef.current = now;

      try {
        const status = await getVerificationStatus();
        const prevStatus = prevVerificationStatusRef.current;
        const statusChanged =
          !prevStatus ||
          prevStatus.isEmailVerified !== status.isEmailVerified ||
          prevStatus.isPhoneVerified !== status.isPhoneVerified;

        if (statusChanged) {
          setVerificationStatus(status);
          prevVerificationStatusRef.current = status;
        }
      } catch (error) {
        console.log("Error checking verification status:", error);
        showError(
          t("common.error", "Error"),
          t(
            "profile.verificationCheckError",
            "Failed to check verification status."
          )
        );
      }
    }, []);

    const startPolling = useCallback(() => {
      if (isPollingActiveRef.current) return;
      isPollingActiveRef.current = true;
      checkVerificationStatus();
      verificationCheckIntervalRef.current = setInterval(() => {
        checkVerificationStatus();
      }, 5000) as unknown as NodeJS.Timeout;
    }, [checkVerificationStatus]);

    const stopPolling = useCallback(() => {
      if (verificationCheckIntervalRef.current) {
        clearInterval(verificationCheckIntervalRef.current);
        verificationCheckIntervalRef.current = null;
      }
      isPollingActiveRef.current = false;
    }, []);

    const handleAppStateChange = useCallback(
      (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          checkVerificationStatus();
        }

        appStateRef.current = nextAppState;
      },
      [checkVerificationStatus]
    );

    const fetchProfileData = useCallback(async () => {
      if (isLoadingRef.current) {
        return;
      }

      try {
        isLoadingRef.current = true;
        const now = Date.now();
        const shouldFetch =
          isInitialMount.current || now - lastUpdateRef.current >= 10000;

        if (!shouldFetch) {
          isLoadingRef.current = false;
          return;
        }

        lastUpdateRef.current = now;

        const [status, profile] = await Promise.all([
          getVerificationStatus(),
          getUserProfile(),
        ]);

        if (isInitialMount.current) {
          isInitialMount.current = false;
        }

        setVerificationStatus(status);
        prevVerificationStatusRef.current = status;
        setProfileData(profile);

        setUser({
          ...profile,
          id: profile.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email || "",
          phone: profile.phone || "",
          birthDate: profile.birthDate || "",
          profileImage: profile.profileImage || "",
          bio: profile.bio || "",
          location: profile.location || {
            city: "",
            street: "",
            country: "",
          },
          stats: profile.stats || {
            reviewCount: 0,
            favoriteCount: 0,
            completedReservationsCount: 0,
            points: 0,
          },
        });
      } catch (error) {
        console.log("Error fetching profile data:", error);
        showError(
          t("common.error", "Error"),
          t("profile.fetchProfileError", "Failed to fetch profile data.")
        );
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }, [setUser, t]);

    useEffect(() => {
      fetchProfileData();
      startPolling();
      const subscription = AppState.addEventListener(
        "change",
        handleAppStateChange
      );
      return () => {
        stopPolling();
        subscription.remove();
      };
    }, [fetchProfileData, startPolling, stopPolling, handleAppStateChange]);

    useFocusEffect(
      useCallback(() => {
        fetchProfileData();
        startPolling();

        return () => {
          stopPolling();
        };
      }, [fetchProfileData, startPolling, stopPolling])
    );

    const isVerified =
      verificationStatus.isEmailVerified && verificationStatus.isPhoneVerified;

    const handleVerify = () => {
      router.push("/(screens)/profile/settings");
    };

    if (isLoading) {
      return <LoadingScreen />;
    }

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View
          style={{ borderBottomColor: colors.border }}
          className="flex-row justify-between p-[16px] border-b-[1px]"
        >
          <Text
            style={{ color: colors.textPrimary }}
            className="text-[18px] font-degular-semibold leading-[28px] my-[3px]"
          >
            {t("profile.profileHeader", "Profile")}
          </Text>
          <TouchableOpacity
            className="p-[10px]"
            onPress={() => router.push("/(screens)/profile/settings")}
          >
            <SettingsIcon color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View className="flex-1 px-[16px] pt-[24px]">
          <View className="items-center">
            <View className="mb-4">
              {profileData.profileImage ? (
                <Image
                  source={{ uri: profileData.profileImage }}
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 46,
                    borderWidth: 2,
                    borderColor: colors.appPrimary,
                  }}
                />
              ) : (
                <Image
                  source={require("@/assets/images/avatar.jpg")}
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 46,
                    borderWidth: 2,
                    borderColor: colors.appPrimary,
                  }}
                />
              )}
            </View>

            <Text
              style={{ color: colors.textPrimary }}
              className="text-[20px] font-degular-semibold mb-[4px]"
            >
              {profileData.firstName} {profileData.lastName}
            </Text>

            {profileData.location &&
              (profileData.location.city ||
                profileData.location.street ||
                profileData.location.country) && (
                <View className="flex-row items-center">
                  <LocationIcon />
                  <Text
                    style={{ color: "#9CA3AF" }}
                    className="font-degular text-[14px] ml-[4px]"
                  >
                    {[
                      profileData.location.street,
                      profileData.location.city,
                      profileData.location.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
              )}

            <TouchableOpacity
              style={{
                borderColor: colors.appPrimary,
              }}
              className="flex-row items-center justify-center border rounded-[8px] py-[9px] px-[25px] mt-[16px]"
              onPress={() => router.push("/(screens)/profile/edit-profile")}
            >
              <EditProfileIcon />
              <Text
                style={{ color: colors.appPrimary }}
                className="font-degular-medium mx-[2px]"
              >
                {t("profile.editProfile", "Edit Profile")}
              </Text>
            </TouchableOpacity>

            {!isVerified && (
              <View className="w-full mt-[16px]">
                <VerificationBanner onVerify={handleVerify} />
              </View>
            )}

            <View className="w-full flex-col gap-[24px] my-[32px]">
              <StatsCard
                reviews={profileData.stats?.reviewCount || 0}
                favorites={profileData.stats?.favoriteCount || 0}
                reservations={
                  profileData.stats?.completedReservationsCount || 0
                }
                points={profileData.stats?.points || 0}
              />

              <SavedCard />
              <ReservationsCard />
              <AchievementsCard />
              <AccountSettingsCard />
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }
);

const LoadingScreen = memo(() => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size="large" color={colors.appPrimary} />
      <Text style={{ color: colors.textSecondary }} className="mt-4">
        {t("common.loading", "Učitavanje...")}
      </Text>
    </View>
  );
});

export default function ProfileScreen() {
  const { user, isLoading, setUser } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const { t } = useTranslation();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setUser(null);
    } catch (error) {
      console.log("Error during logout:", error);
      Alert.alert(
        t("common.error", "Error"),
        t("auth.logoutError", "Failed to logout. Please try again.")
      );
    }
  }, [setUser, t]);

  if (isLoading) {
    return (
      <ThemedView className="flex-1">
        <LoadingScreen />
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      {!user ? (
        <AuthScreen showSignUp={showSignUp} setShowSignUp={setShowSignUp} />
      ) : (
        <ProfileContent user={user} handleLogout={handleLogout} />
      )}
    </ThemedView>
  );
}

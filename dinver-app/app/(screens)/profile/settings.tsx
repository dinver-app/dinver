/* eslint-disable import/no-named-as-default */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  verifyEmail,
  verifyPhone,
  confirmPhoneVerification,
} from "@/services/verifyService";
import {
  getUserSettings,
  getVerificationStatus,
  updateNotificationSetting,
  getUserProfile,
  clearSearchHistory,
} from "@/services/userService";
import { VerificationStatus } from "@/utils/validation";
import { showSuccess, showError, showInfo } from "@/utils/toast";
import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import { ArrowBack } from "@/assets/icons/icons";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeSelector from "@/components/ThemeSelector";

const SettingsScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { currentLanguage } = useLanguage();
  const { colors, theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
  const [isVerificationCodeModalVisible, setIsVerificationCodeModalVisible] =
    useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>({
      isEmailVerified: false,
      isPhoneVerified: false,
    });
  const [notifications, setNotifications] = useState({
    push: false,
    email: false,
    sms: false,
  });

  const verificationCheckIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
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
        if (prevStatus) {
          if (!prevStatus.isEmailVerified && status.isEmailVerified) {
            showSuccess(
              t("profile.emailVerified", "Email successfully verified!")
            );
          }
          if (!prevStatus.isPhoneVerified && status.isPhoneVerified) {
            showSuccess(
              t("profile.phoneVerified", "Phone successfully verified!")
            );
          }
        }
      }
    } catch (error) {
      console.log("Error checking verification status:", error);
      showError(
        t(
          "profile.verificationStatusError",
          "Failed to check verification status. Please try again."
        )
      );
    }
  }, [t]);

  const startPolling = useCallback(() => {
    if (isPollingActiveRef.current) return;
    isPollingActiveRef.current = true;
    checkVerificationStatus();
    verificationCheckIntervalRef.current = setInterval(() => {
      checkVerificationStatus();
    }, 5000);
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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);

        const userSettings = await getUserSettings();

        if (userSettings.notifications) {
          setNotifications({
            push: userSettings.notifications.push || false,
            email: userSettings.notifications.email || false,
            sms: userSettings.notifications.sms || false,
          });
        }
        const verificationData = await getVerificationStatus();
        setVerificationStatus(verificationData);
        prevVerificationStatusRef.current = verificationData;

        const userProfile = await getUserProfile();
        setUserPhone(userProfile.phone || "");
      } catch (error) {
        console.log("Failed to fetch settings:", error);
        showError(t("settings.fetchSettingsError", "Failed to fetch settings"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
    startPolling();
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [startPolling, stopPolling, handleAppStateChange, t]);

  useFocusEffect(
    useCallback(() => {
      startPolling();

      return () => {
        stopPolling();
      };
    }, [startPolling, stopPolling])
  );

  const toggleNotification = async (type: "push" | "email" | "sms") => {
    try {
      const newValue = !notifications[type];

      setNotifications((prev) => ({
        ...prev,
        [type]: newValue,
      }));

      await updateNotificationSetting(type, newValue);
    } catch (error) {
      console.log(`Failed to update ${type} notification:`, error);
      showError(
        t(
          `settings.update${
            type.charAt(0).toUpperCase() + type.slice(1)
          }NotificationError`,
          `Failed to update ${type} notification`
        )
      );
      setNotifications((prev) => ({ ...prev }));
    }
  };

  const handleVerifyEmail = async () => {
    try {
      showInfo(
        t(
          "profile.emailVerificationInProgress",
          "Sending email verification..."
        )
      );

      const success = await verifyEmail();

      if (success) {
        showSuccess(
          t(
            "profile.emailVerificationSent",
            "Email verification link has been sent to your email"
          )
        );
        startPolling();
      } else {
        showError(
          t(
            "profile.emailVerificationError",
            "Failed to send verification email. Please try again."
          )
        );
      }
    } catch (error: any) {
      console.log("Error verifying email:", error);

      if (error?.response?.status === 401) {
        showError(
          t(
            "profile.emailVerificationServerError",
            "Server error: Unable to process verification request."
          )
        );
      } else {
        showError(
          t(
            "profile.emailVerificationError",
            "Failed to send verification email. Please try again later."
          )
        );
      }
    }
  };

  const handleVerifyPhone = async () => {
    try {
      showInfo(
        t(
          "profile.phoneVerificationInProgress",
          "Sending phone verification..."
        )
      );

      const success = await verifyPhone(userPhone);

      if (success) {
        showSuccess(
          t(
            "profile.phoneVerificationSent",
            "Phone verification code has been sent to your phone"
          )
        );
        setIsVerificationCodeModalVisible(true);
        startPolling();
      } else {
        showError(
          t(
            "profile.phoneVerificationError",
            "Failed to send verification code. Please try again."
          )
        );
      }
    } catch (error: any) {
      console.log("Error verifying phone:", error);

      showError(
        t(
          "profile.phoneVerificationError",
          "Failed to send verification code. Please try again later."
        )
      );
    }
  };

  const handleSubmitVerificationCode = async () => {
    try {
      setIsSubmittingCode(true);

      const success = await confirmPhoneVerification(verificationCode);

      if (success) {
        showSuccess(
          t(
            "profile.phoneVerificationSuccess",
            "Phone number successfully verified"
          )
        );
        setVerificationStatus((prev) => ({
          ...prev,
          isPhoneVerified: true,
        }));
        prevVerificationStatusRef.current = {
          ...prevVerificationStatusRef.current!,
          isPhoneVerified: true,
        };
        setIsVerificationCodeModalVisible(false);
      } else {
        showError(
          t(
            "profile.phoneVerificationInvalidCode",
            "Invalid verification code. Please try again."
          )
        );
      }
    } catch (error: any) {
      console.log("Error submitting verification code:", error);

      showError(
        t(
          "profile.phoneVerificationError",
          "Failed to verify phone number. Please try again later."
        )
      );
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleClearSearchHistory = async () => {
    try {
      await clearSearchHistory();
      showSuccess(
        t("settings.searchHistoryCleared", "Search history has been cleared")
      );
    } catch (error) {
      console.log("Failed to clear search history:", error);
      showError(
        t("settings.searchHistoryClearError", "Failed to clear search history")
      );
    }
  };

  return (
    <View style={{ backgroundColor: colors.background }} className="flex-1">
      <View
        style={{ borderBottomColor: colors.border }}
        className="p-[22px] border-b-[1px]"
      >
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => router.back()}
        >
          <ArrowBack color={colors.textPrimary} />
          <Text
            style={{ color: colors.textPrimary }}
            className="text-[18px] font-degular-semibold ml-[18px]"
          >
            {t("settings.title", "Settings")}
          </Text>
        </TouchableOpacity>
      </View>
      <Stack.Screen
        options={{
          headerShadowVisible: false,
        }}
      />

      {isLoading ? (
        <View className="flex-1 justify-center items-center h-[80vh]">
          <ActivityIndicator size="large" color={colors.appPrimary} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-4">
          <Text
            style={{ color: colors.textPrimary }}
            className="text-xl font-degular-medium my-4"
          >
            {t("profile.accountVerification", "Account Verification")}
          </Text>
          <View
            style={{ backgroundColor: colors.cardSecondaryBackground }}
            className="rounded-2xl p-4 mb-4 flex-row justify-between items-center"
          >
            <View className="flex-row items-center">
              {verificationStatus.isEmailVerified ? (
                <View className="w-10 h-10 items-center justify-center">
                  <View
                    style={{ backgroundColor: "#10B981" }}
                    className="w-8 h-8 rounded-md items-center justify-center"
                  >
                    <MaterialIcons name="mail" size={16} color="white" />
                  </View>
                </View>
              ) : (
                <View className="w-10 h-10 items-center justify-center">
                  <View
                    style={{ backgroundColor: "#FACC15" }}
                    className="w-8 h-8 rounded-md items-center justify-center"
                  >
                    <MaterialIcons name="mail" size={16} color="white" />
                  </View>
                </View>
              )}
              <View className="ml-2">
                <Text
                  style={{ color: colors.textPrimary }}
                  className="text-base font-degular-medium"
                >
                  {t("profile.emailVerification", "Email Verification")}
                </Text>
                <Text
                  style={{
                    color: verificationStatus.isEmailVerified
                      ? "#10B981"
                      : "#FACC15",
                  }}
                  className="text-sm"
                >
                  {verificationStatus.isEmailVerified
                    ? t("profile.verified", "Verified")
                    : t("profile.pending", "Pending")}
                </Text>
              </View>
            </View>

            {verificationStatus.isEmailVerified ? (
              <View
                style={{ backgroundColor: "#10B981" }}
                className="w-8 h-8 rounded-full items-center justify-center"
              >
                <Feather name="check" size={18} color="white" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleVerifyEmail}
                style={{ backgroundColor: colors.appPrimary }}
                className="px-6 py-2 rounded-full"
              >
                <Text style={{ color: "white" }} className="font-degular">
                  {t("profile.verify", "Verify")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={{ backgroundColor: colors.cardSecondaryBackground }}
            className="rounded-2xl p-4 mb-4 flex-row justify-between items-center"
          >
            <View className="flex-row items-center">
              {verificationStatus.isPhoneVerified ? (
                <View className="w-10 h-10 items-center justify-center">
                  <View
                    style={{ backgroundColor: "#10B981" }}
                    className="w-8 h-8 rounded-md items-center justify-center"
                  >
                    <FontAwesome5 name="mobile-alt" size={16} color="white" />
                  </View>
                </View>
              ) : (
                <View className="w-10 h-10 items-center justify-center">
                  <View
                    style={{ backgroundColor: "#FACC15" }}
                    className="w-8 h-8 rounded-md items-center justify-center"
                  >
                    <FontAwesome5 name="mobile-alt" size={16} color="white" />
                  </View>
                </View>
              )}
              <View className="ml-2">
                <Text
                  style={{ color: colors.textPrimary }}
                  className="text-base font-degular-medium"
                >
                  {t("profile.phoneVerification", "Phone Verification")}
                </Text>
                <Text
                  style={{
                    color: verificationStatus.isPhoneVerified
                      ? "#10B981"
                      : "#FACC15",
                  }}
                  className="text-sm"
                >
                  {verificationStatus.isPhoneVerified
                    ? t("profile.verified", "Verified")
                    : t("profile.pending", "Pending")}
                </Text>
              </View>
            </View>

            {verificationStatus.isPhoneVerified ? (
              <View
                style={{ backgroundColor: "#10B981" }}
                className="w-8 h-8 rounded-full items-center justify-center"
              >
                <Feather name="check" size={18} color="white" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleVerifyPhone}
                style={{ backgroundColor: colors.appPrimary }}
                className="px-6 py-2 rounded-full"
              >
                <Text style={{ color: "white" }} className="font-degular">
                  {t("profile.verify", "Verify")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text
            style={{ color: colors.textPrimary }}
            className="text-xl font-degular-medium mt-6 mb-4"
          >
            {t("settings.appSettings", "App Settings")}
          </Text>

          <TouchableOpacity
            style={{ borderBottomColor: colors.border }}
            className="flex-row items-center justify-between py-[12px] border-b"
            onPress={() => setIsLanguageModalVisible(true)}
          >
            <View className="flex-row items-center">
              <Ionicons name="globe-outline" size={24} color="#9CA3AF" />
              <Text
                style={{ color: colors.textPrimary }}
                className="ml-4 font-degular"
              >
                {t("common.language", "Language")}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text
                style={{ color: colors.textSecondary }}
                className="font-degular mr-2"
              >
                {currentLanguage === "en"
                  ? t("profile.english", "English")
                  : t("profile.croatian", "Hrvatski")}
              </Text>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ borderBottomColor: colors.border }}
            className="flex-row items-center justify-between py-[12px] border-b"
            onPress={() => setIsThemeModalVisible(true)}
          >
            <View className="flex-row items-center">
              <Ionicons
                name={theme === "dark" ? "moon-outline" : "sunny-outline"}
                size={24}
                color="#9CA3AF"
              />
              <Text
                style={{ color: colors.textPrimary }}
                className="ml-4 font-degular"
              >
                {t("settings.theme", "Theme")}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text
                style={{ color: colors.textSecondary }}
                className="font-degular mr-2"
              >
                {theme === "light"
                  ? t("settings.light", "Light")
                  : theme === "dark"
                  ? t("settings.dark", "Dark")
                  : t("settings.system", "System Default")}
              </Text>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <Text
            style={{ color: colors.textPrimary }}
            className="text-xl font-degular-medium mt-6 mb-4"
          >
            {t("settings.notificationSettings", "Notification Settings")}
          </Text>

          <View
            style={{ borderBottomColor: colors.border }}
            className="flex-row justify-between items-center py-4 border-b"
          >
            <View className="flex-row items-center">
              <Feather name="bell" size={24} color="#9CA3AF" />
              <Text
                style={{ color: colors.textPrimary }}
                className="ml-4 font-degular"
              >
                {t("settings.pushNotifications", "Push Notifications")}
              </Text>
            </View>
            <Switch
              value={notifications.push}
              onValueChange={() => toggleNotification("push")}
              trackColor={{ false: "#3e3e3e", true: colors.appPrimary }}
              thumbColor="#f4f3f4"
            />
          </View>

          <View
            style={{ borderBottomColor: colors.border }}
            className="flex-row justify-between items-center py-4 border-b"
          >
            <View className="flex-row items-center">
              <MaterialIcons name="email" size={24} color="#9CA3AF" />
              <Text
                style={{ color: colors.textPrimary }}
                className="ml-4 font-degular"
              >
                {t("settings.emailNotifications", "Email Notifications")}
              </Text>
            </View>
            <Switch
              value={notifications.email}
              onValueChange={() => toggleNotification("email")}
              trackColor={{ false: "#3e3e3e", true: colors.appPrimary }}
              thumbColor="#f4f3f4"
            />
          </View>

          <View
            style={{ borderBottomColor: colors.border }}
            className="flex-row justify-between items-center py-4 border-b"
          >
            <View className="flex-row items-center">
              <Feather name="smartphone" size={24} color="#9CA3AF" />
              <Text
                style={{ color: colors.textPrimary }}
                className="ml-4 font-degular"
              >
                {t("settings.smsNotifications", "SMS Notifications")}
              </Text>
            </View>
            <Switch
              value={notifications.sms}
              onValueChange={() => toggleNotification("sms")}
              trackColor={{ false: "#3e3e3e", true: colors.appPrimary }}
              thumbColor="#f4f3f4"
            />
          </View>

          <Text
            style={{ color: colors.textPrimary }}
            className="text-xl font-degular-medium mt-6 mb-4"
          >
            {t("settings.privacy", "Privacy")}
          </Text>
          <TouchableOpacity
            style={{ borderBottomColor: colors.border }}
            className="flex-row items-center justify-between py-[12px] border-b"
            onPress={() => router.push("/profile/change-password")}
          >
            <View className="flex-row items-center">
              <Feather name="lock" size={24} color="#9CA3AF" />
              <Text
                style={{ color: colors.textPrimary }}
                className="ml-4 font-degular"
              >
                {t("settings.changePassword", "Change Password")}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ borderBottomColor: colors.border }}
            className="flex-row items-center justify-between py-[12px] border-b"
            onPress={handleClearSearchHistory}
          >
            <View className="flex-row items-center">
              <Feather name="trash-2" size={24} color="#9CA3AF" />
              <Text
                style={{ color: colors.textPrimary }}
                className="ml-4 font-degular"
              >
                {t("settings.clearSearchHistory", "Clear Search History")}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <Text
            style={{ color: colors.textPrimary }}
            className="text-xl font-degular-medium mt-6 mb-4"
          >
            {t("settings.appInformation", "App information")}
          </Text>

          <TouchableOpacity
            style={{ borderBottomColor: colors.border }}
            className="flex-row items-center justify-between py-[12px] border-b"
            onPress={() => router.push("/profile/terms-of-service")}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="document-text-outline"
                size={24}
                color="#9CA3AF"
              />
              <Text
                style={{ color: colors.textPrimary }}
                className="ml-4 font-degular"
              >
                {t("settings.termsOfService", "Terms of Service")}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ borderBottomColor: colors.border }}
            className="flex-row items-center justify-between py-[12px] border-b"
            onPress={() => router.push("/profile/privacy-policy")}
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-outline" size={24} color="#9CA3AF" />
              <Text
                style={{ color: colors.textPrimary }}
                className="ml-4 font-degular"
              >
                {t("settings.privacyPolicy", "Privacy Policy")}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View className="py-8 items-center">
            <Text style={{ color: colors.textSecondary }} className="text-sm">
              {t("settings.appVersion", "App Version")} 1.0.0
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Using the LanguageSelector component */}
      <LanguageSelector
        isVisible={isLanguageModalVisible}
        onClose={() => setIsLanguageModalVisible(false)}
      />

      {/* Using the ThemeSelector component */}
      <ThemeSelector
        isVisible={isThemeModalVisible}
        onClose={() => setIsThemeModalVisible(false)}
      />

      <Modal
        visible={isVerificationCodeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVerificationCodeModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setIsVerificationCodeModalVisible(false)}
            className="bg-black/50 flex justify-center items-center"
          >
            <View
              style={{ backgroundColor: colors.cardBackground }}
              className="rounded-[16px] p-[20px] w-[80%]"
            >
              <Text
                style={{ color: colors.textPrimary }}
                className="font-degular-medium text-[18px] leading-[28px] mb-[16px] border-b border-gray-200 pb-2"
              >
                {t("profile.enterVerificationCode", "Enter Verification Code")}
              </Text>

              <TextInput
                style={{
                  borderColor: colors.border,
                  color: colors.textPrimary,
                }}
                className="border rounded-[8px] p-[12px] mb-[16px]"
                placeholder={t("profile.verificationCode", "Verification Code")}
                placeholderTextColor={colors.textSecondary}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
              />

              <TouchableOpacity
                onPress={handleSubmitVerificationCode}
                disabled={isSubmittingCode}
                style={{
                  backgroundColor: isSubmittingCode
                    ? colors.border
                    : colors.appPrimary,
                }}
                className="py-[12px] rounded-[8px] items-center"
              >
                <Text
                  style={{ color: "white" }}
                  className="font-degular-medium"
                >
                  {isSubmittingCode
                    ? t("profile.submitting", "Submitting...")
                    : t("profile.submit", "Submit")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default SettingsScreen;

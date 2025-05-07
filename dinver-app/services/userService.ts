/* eslint-disable import/no-named-as-default-member */
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { showError, showSuccess } from "@/utils/toast";
import { AppError, createError } from "@/utils/errors";
import {
  UserSettings,
  UserSettingsResponse,
  UpdateUserSettings,
  userSettingsResponseSchema,
  UserProfile,
  UpdateUserProfile,
  userProfileSchema,
  ProfileImageResponse,
  profileImageResponseSchema,
  DeleteProfileImageResponse,
  deleteProfileImageResponseSchema,
  VerificationStatus,
  verificationStatusSchema,
  ChangePasswordResponse,
  ChangePasswordRequest,
  changePasswordResponseSchema,
  SearchHistoryItem,
  SearchHistoryResponse,
  SearchHistoryRequest,
  UserStatsDetails,
  userStatsDetailsSchema,
} from "@/utils/validation";
import { isAuthenticated, authRequest } from "./api";
import i18next from "i18next";

const API_KEY = process.env.EXPO_PUBLIC_MOBILE_APP_API_KEY || "";
const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.dinver.eu/api/app";
const ACCESS_TOKEN_KEY = "accessToken";
const SEARCH_HISTORY_KEY = "searchHistory";

const ENDPOINTS = {
  SETTINGS: "/user/settings",
  PROFILE: "/user/profile",
  PROFILE_IMAGE: "/user/profile/image",
  VERIFICATION_STATUS: "/auth/verification-status",
  SEARCH_HISTORY: "/user/search-history",
  CHANGE_PASSWORD: "/user/change-password",
};

const t = (key: string) => i18next.t(key);

// User settings functions
export const getUserSettings = async (): Promise<UserSettings> => {
  try {
    const response = await authRequest<UserSettingsResponse>(
      "get",
      ENDPOINTS.SETTINGS
    );
    return userSettingsResponseSchema.parse(response).settings;
  } catch (error) {
    console.log("Error fetching user settings:", error);
    showError(t("common.error"), t("user.settingsRetrievalError"));
    throw error;
  }
};

export const updateUserSettings = async (
  updateData: UpdateUserSettings
): Promise<UserSettings> => {
  try {
    const response = await authRequest<UserSettingsResponse>(
      "patch",
      ENDPOINTS.SETTINGS,
      updateData
    );
    const result = userSettingsResponseSchema.parse(response).settings;
    showSuccess(t("user.settingsUpdated"), t("user.settingsSaved"));
    return result;
  } catch (error) {
    console.log("Error updating user settings:", error);
    showError(t("common.error"), t("user.settingsUpdateError"));
    throw error;
  }
};

export const updateNotificationSetting = async (
  type: "push" | "email" | "sms",
  enabled: boolean
): Promise<UserSettings> => {
  return updateUserSettings({
    settings: { notifications: { [type]: enabled } },
  });
};

export const updateLanguage = async (
  language: string
): Promise<UserSettings> => {
  return updateUserSettings({
    settings: { language },
  });
};

// User profile functions
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const response = await authRequest<UserProfile>("get", ENDPOINTS.PROFILE);
    return userProfileSchema.parse(response);
  } catch (error) {
    console.log("Error fetching user profile:", error);
    showError(t("common.error"), t("user.profileRetrievalError"));
    throw error;
  }
};

export const updateUserProfile = async (
  profileData: UpdateUserProfile
): Promise<UserProfile> => {
  try {
    const response = await authRequest<UserProfile>(
      "patch",
      ENDPOINTS.PROFILE,
      profileData
    );
    const result = userProfileSchema.parse(response);
    showSuccess(t("user.profileUpdated"), t("user.profileSaved"));
    return result;
  } catch (error: any) {
    if (
      error.response?.data?.error ===
      "This phone number is already in use by another user"
    ) {
      showError(
        t("user.profileUpdateError"),
        t("errors.phoneInUse")
      );
      error.isHandled = true;
      return Promise.reject({
        isHandled: true,
        field: "phone",
        message: t("errors.phoneInUse"),
      });
    } else if (
      error.response?.data?.error ===
      "This email address is already in use by another user"
    ) {
      showError(
        t("user.profileUpdateError"),
        t("user.emailInUse")
      );
      error.isHandled = true;
      return Promise.reject({
        isHandled: true,
        field: "email",
        message: t("user.emailInUse"),
      });
    } else {
      console.log("Error updating user profile:", error);
      showError(t("common.error"), t("user.profileUpdateError"));
      throw error;
    }
  }
};

export const updateProfileField = async (
  field: keyof UpdateUserProfile,
  value: any
): Promise<UserProfile> => {
  return updateUserProfile({ [field]: value });
};

// Profile image functions
export const uploadProfileImage = async (
  imageUri: string
): Promise<ProfileImageResponse> => {
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) throw new Error("User is not authenticated");

    const formData = new FormData();
    const uriParts = imageUri.split("/");
    const filename = uriParts[uriParts.length - 1];

    formData.append("image", {
      uri: imageUri,
      name: filename,
      type: `image/${filename.split(".").pop()}`,
    } as any);

    const response = await axios.post(
      `${BASE_URL}${ENDPOINTS.PROFILE_IMAGE}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: token,
          "x-api-key": API_KEY,
        },
      }
    );

    const result = profileImageResponseSchema.parse(response.data);
    showSuccess(t("user.imageUploaded"), t("user.profileImageUpdated"));
    return result;
  } catch (error) {
    console.log("Error uploading profile image:", error);
    showError(t("common.error"), t("user.imageUploadError"));
    throw error;
  }
};

export const deleteProfileImage =
  async (): Promise<DeleteProfileImageResponse> => {
    try {
      const response = await authRequest<DeleteProfileImageResponse>(
        "delete",
        ENDPOINTS.PROFILE_IMAGE
      );
      const result = deleteProfileImageResponseSchema.parse(response);
      showSuccess(t("user.imageRemoved"), t("user.profileImageRemoved"));
      return result;
    } catch (error) {
      console.log("Error deleting profile image:", error);
      showError(t("common.error"), t("user.imageRemoveError"));
      throw error;
    }
  };

// Verification functions
export const getVerificationStatus = async (): Promise<VerificationStatus> => {
  try {
    const response = await authRequest<VerificationStatus>(
      "get",
      ENDPOINTS.VERIFICATION_STATUS
    );
    return verificationStatusSchema.parse(response);
  } catch (error) {
    console.log("Error fetching verification status:", error);
    throw error;
  }
};

// Password functions
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResponse> => {
  // Validate inputs first
  try {
    if (!currentPassword) {
      throw createError(t("user.currentPasswordRequired"), "REQUIRED_FIELD");
    }

    if (!newPassword) {
      throw createError(t("user.newPasswordRequired"), "REQUIRED_FIELD");
    }

    if (newPassword.length < 6) {
      throw createError(t("user.passwordMinLength"), "PASSWORD_REQUIREMENTS");
    }

    if (currentPassword === newPassword) {
      throw createError(t("user.passwordMustBeDifferent"), "SAME_PASSWORD");
    }

    // Check authentication status
    if (!(await isAuthenticated())) {
      throw createError(t("user.authRequired"), "AUTH_REQUIRED");
    }

    // Schema validation is now redundant as we've done validation above
    const data: ChangePasswordRequest = {
      currentPassword,
      newPassword,
    };

    // Use direct axios call instead of authRequest to prevent token clearing on 401
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      throw createError(t("user.authRequired"), "AUTH_REQUIRED");
    }
    
    const url = `${BASE_URL}${ENDPOINTS.CHANGE_PASSWORD}`;
    const response = await axios.post(url, data, {
      headers: {
        Authorization: token,
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
      }
    });
    
    const result = changePasswordResponseSchema.parse(response.data);
    showSuccess(
      t("user.passwordChanged"),
      t("user.passwordUpdatedSuccess")
    );
    return result;
  } catch (error: any) {
    // Handle client-side validation errors
    if (error.code === "REQUIRED_FIELD") {
      showError(t("user.passwordChangeFailed"), error.message);
      throw error;
    }
    
    if (error.code === "PASSWORD_REQUIREMENTS") {
      showError(t("user.passwordChangeFailed"), error.message);
      throw error;
    }
    
    if (error.code === "SAME_PASSWORD") {
      showError(t("user.passwordChangeFailed"), error.message);
      throw error;
    }
    
    if (error.code === "AUTH_REQUIRED") {
      showError(t("user.authError"), t("user.loginRequiredForPasswordChange"));
      throw error;
    }

    // Handle API error responses
    if (error.response?.data) {
      const errorMsg = error.response.data.message || error.response.data.error;
      const appError = error as AppError;
      
      if (error.response.status === 401 || 
          errorMsg?.toLowerCase().includes("current password") || 
          errorMsg?.toLowerCase().includes("incorrect password")) {
        showError(t("user.passwordChangeFailed"), t("user.currentPasswordIncorrect"));
        appError.code = "INCORRECT_PASSWORD";
        appError.isHandled = true; // Mark as handled so interceptor doesn't clear auth
      } else {
        showError(t("user.passwordChangeFailed"), errorMsg || t("user.unableToChangePassword"));
      }
    } else {
      showError(t("user.passwordChangeFailed"), t("user.unableToChangePassword"));
    }
    
    throw error;
  }
};

// Search history functions
export const saveSearchTerm = async (searchTerm: string): Promise<void> => {
  if (!searchTerm?.trim()) return;

  try {
    // Save to API if user is authenticated
    if (await isAuthenticated()) {
      try {
        const request: SearchHistoryRequest = { searchTerm: searchTerm.trim() };
        await authRequest<SearchHistoryResponse>(
          "post",
          ENDPOINTS.SEARCH_HISTORY,
          request
        );
      } catch (error) {
        console.log("Failed to save search history to API:", error);
      }
    }

    // Always save locally
    const existingHistoryJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    let existingHistory: SearchHistoryItem[] = [];

    if (existingHistoryJson) {
      try {
        const parsed = JSON.parse(existingHistoryJson);
        existingHistory = Array.isArray(parsed)
          ? parsed.filter((item) => item?.searchTerm?.trim())
          : [];
      } catch (e) {
        console.log("Error parsing search history:", e);
      }
    }

    // Remove existing entry (if any) to avoid duplicates
    const filteredHistory = existingHistory.filter(
      (item) => item.searchTerm.toLowerCase() !== searchTerm.toLowerCase()
    );

    // Add new search term at beginning (most recent)
    const updatedHistory = [
      { searchTerm: searchTerm.trim(), timestamp: Date.now() },
      ...filteredHistory,
    ].slice(0, 5); // Keep only 5 recent searches

    await AsyncStorage.setItem(
      SEARCH_HISTORY_KEY,
      JSON.stringify(updatedHistory)
    );
  } catch (error) {
    console.log("Failed to save search term:", error);
  }
};

export const getSearchHistory = async (): Promise<SearchHistoryItem[]> => {
  try {
    const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (!historyJson) return [];

    let parsed;
    try {
      parsed = JSON.parse(historyJson);
    } catch (e) {
      console.log("Error parsing search history:", e);
      return [];
    }

    // Validate and filter search history items
    const history: SearchHistoryItem[] = Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            item.searchTerm &&
            typeof item.searchTerm === "string" &&
            item.timestamp &&
            typeof item.timestamp === "number"
        )
      : [];

    // Sort by timestamp (most recent first)
    return history.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  } catch (error) {
    console.log("Failed to get search history:", error);
    return [];
  }
};

export const deleteSearchTerm = async (searchTerm: string): Promise<void> => {
  if (!searchTerm) return;

  try {
    const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (!historyJson) return;

    let history;
    try {
      history = JSON.parse(historyJson);
    } catch (e) {
      console.log("Error parsing search history during deletion:", e);
      return;
    }

    if (!Array.isArray(history)) return;

    const updatedHistory = history.filter(
      (item) => item?.searchTerm?.toLowerCase() !== searchTerm.toLowerCase()
    );

    await AsyncStorage.setItem(
      SEARCH_HISTORY_KEY,
      JSON.stringify(updatedHistory)
    );
  } catch (error) {
    console.log("Failed to delete search term:", error);
  }
};

export const clearSearchHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    showSuccess(
      t("settings.clearSearchHistory"),
      t("settings.searchHistoryCleared")
    );
  } catch (error) {
    console.log("Failed to clear search history:", error);
    showError(t("common.error"), t("settings.searchHistoryClearError"));
    throw error;
  }
};

// User stats functions
export const getUserStats = async (): Promise<UserStatsDetails> => {
  try {
    const response = await authRequest<UserStatsDetails>("get", "/user/stats");
    return userStatsDetailsSchema.parse(response);
  } catch (error) {
    console.log("Error fetching user detailed stats:", error);
    showError(t("common.error"), t("user.statsRetrievalError"));
    throw error;
  }
};

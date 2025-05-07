import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Stack, useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { changePassword } from "@/services/userService";
import { Feather } from "@expo/vector-icons";
import InputField from "@/components/InputField";
import { ArrowBack } from "@/assets/icons/icons";

const ChangePasswordScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const validateForm = () => {
    const errors: {
      confirmPassword?: string;
    } = {};

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = t(
        "profile.passwordsDoNotMatch",
        "Passwords do not match"
      );
      setFormErrors((prev) => ({ ...prev, ...errors }));
      return false;
    }

    return true;
  };

  const isFormValid = () => {
    return (
      !!currentPassword && !!newPassword && newPassword === confirmPassword
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setFormErrors({});
      await changePassword(currentPassword, newPassword);
      setTimeout(() => {
        router.back();
      }, 500);
    } catch (error: any) {
      console.log("Password change error:", error);
      if (error.code === "INCORRECT_PASSWORD") {
        setFormErrors((prev) => ({
          ...prev,
          currentPassword: t(
            "profile.incorrectCurrentPassword",
            "Current password is incorrect"
          ),
        }));
      } else if (error.code === "SAME_PASSWORD") {
        setFormErrors((prev) => ({
          ...prev,
          newPassword: t(
            "profile.passwordSameAsCurrent",
            "New password must be different from your current password"
          ),
        }));
      } else if (error.code === "PASSWORD_REQUIREMENTS") {
        setFormErrors((prev) => ({
          ...prev,
          newPassword: t(
            "profile.passwordRequirements",
            "Password must be at least 6 characters long"
          ),
        }));
      } else if (error.code === "REQUIRED_FIELD") {
        if (error.message.includes("Current password")) {
          setFormErrors((prev) => ({
            ...prev,
            currentPassword: t(
              "profile.requiredField",
              "This field is required"
            ),
          }));
        } else if (error.message.includes("New password")) {
          setFormErrors((prev) => ({
            ...prev,
            newPassword: t("profile.requiredField", "This field is required"),
          }));
        }
      }
    } finally {
      setIsSubmitting(false);
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
            {t("profile.changePassword", "Change Password")}
          </Text>
        </TouchableOpacity>
      </View>
      <Stack.Screen
        options={{
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 pt-4">
          <Text style={{ color: colors.textSecondary }} className="mb-6">
            {t(
              "profile.changePasswordInfo",
              "Enter your current password and choose a new password."
            )}
          </Text>

          <InputField
            label={t("profile.currentPassword", "Current Password")}
            icon={<Feather name="lock" size={20} color={colors.textSecondary} />}
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              if (formErrors.currentPassword) {
                setFormErrors({ ...formErrors, currentPassword: undefined });
              }
            }}
            placeholder={t(
              "profile.enterCurrentPassword",
              "Enter your current password"
            )}
            secureTextEntry={!showCurrentPassword}
            error={formErrors.currentPassword}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Feather
                  name={showCurrentPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          <InputField
            label={t("profile.newPassword", "New Password")}
            icon={<Feather name="lock" size={20} color={colors.textSecondary} />}
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (formErrors.newPassword) {
                setFormErrors({ ...formErrors, newPassword: undefined });
              }
              if (confirmPassword && text !== confirmPassword) {
                setFormErrors({
                  ...formErrors,
                  confirmPassword: t(
                    "profile.passwordsDoNotMatch",
                    "Passwords do not match"
                  ),
                });
              } else if (confirmPassword) {
                setFormErrors({ ...formErrors, confirmPassword: undefined });
              }
            }}
            placeholder={t(
              "profile.enterNewPassword",
              "Enter your new password"
            )}
            secureTextEntry={!showNewPassword}
            error={formErrors.newPassword}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Feather
                  name={showNewPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          <InputField
            label={t("profile.confirmPassword", "Confirm New Password")}
            icon={<Feather name="lock" size={20} color={colors.textSecondary} />}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (newPassword && text !== newPassword) {
                setFormErrors({
                  ...formErrors,
                  confirmPassword: t(
                    "profile.passwordsDoNotMatch",
                    "Passwords do not match"
                  ),
                });
              } else {
                setFormErrors({ ...formErrors, confirmPassword: undefined });
              }
            }}
            placeholder={t(
              "profile.confirmNewPassword",
              "Confirm your new password"
            )}
            secureTextEntry={!showConfirmPassword}
            error={formErrors.confirmPassword}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Feather
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView
        style={{
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        }}
        className="border-t"
      >
        <View className="flex-row px-[12px] py-4">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
            }}
            className="flex-1 items-center py-[12px] rounded-[12px] border-[1px] mr-[16px]"
          >
            <Text style={{ color: colors.textPrimary }} className="font-medium">
              {t("common.cancel", "Cancel")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !isFormValid()}
            style={{
              backgroundColor: isFormValid()
                ? colors.appPrimary
                : colors.border,
            }}
            className="flex-1 items-center py-[12px] rounded-[12px]"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={{ color: "white" }} className="font-medium">
                {t("common.save", "Save")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default ChangePasswordScreen;

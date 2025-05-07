import React, { useState, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { login, forgotPassword } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";
import InputField from "@/components/InputField";
import {
  EmailIcon,
  PasswordIcon,
  HiddenIcon,
  ShowPasswordIcon,
} from "@/assets/icons/icons";

interface SignInFormProps {
  onCreateAccount?: () => void;
  onForgotPassword: () => void;
}

const SignInForm: React.FC<SignInFormProps> = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    resetEmail?: string;
    general?: string;
  }>({});
  const { setUser } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prevState) => ({
      ...prevState,
      [field]: value,
    }));

    if (errors[field as keyof typeof errors]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: undefined,
      }));
    }
  };

  const handleEmailChange = (text: string) => {
    handleInputChange("email", text);
  };

  const handlePasswordChange = (text: string) => {
    handleInputChange("password", text);
  };

  const validateForm = (): boolean => {
    const newErrors: {
      email?: string;
      password?: string;
    } = {};

    if (!formData.email) {
      newErrors.email = t("auth.emailRequired", "Email is required");
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(formData.email)
    ) {
      newErrors.email = t(
        "auth.invalidEmail",
        "Please enter a valid email address"
      );
    }

    if (!formData.password) {
      newErrors.password = t("auth.passwordRequired", "Password is required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateResetEmail = (): boolean => {
    if (!resetEmail) {
      setErrors((prev) => ({
        ...prev,
        resetEmail: t("auth.emailRequired", "Email is required"),
      }));
      return false;
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(resetEmail)) {
      setErrors((prev) => ({
        ...prev,
        resetEmail: t(
          "auth.invalidEmail",
          "Please enter a valid email address"
        ),
      }));
      return false;
    }
    setErrors((prev) => ({ ...prev, resetEmail: undefined }));
    return true;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const loggedInUser = await login({
        email: formData.email,
        password: formData.password,
      });
      setUser(loggedInUser);
    } catch (error: any) {
      let errorMessage = t("auth.invalidCredentials", "Invalid credentials");
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setErrors({
        ...errors,
        general: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(formData.email);
    setShowForgotPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!validateResetEmail()) return;

    setResetLoading(true);
    try {
      const message = await forgotPassword(resetEmail);
      setShowForgotPasswordModal(false);
      Alert.alert(t("auth.passwordResetSent", "Password Reset"), message);
    } catch (error: any) {
      let errorMessage = t(
        "auth.passwordResetError",
        "Failed to send password reset link"
      );
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setErrors({
        ...errors,
        resetEmail: errorMessage,
      });
    } finally {
      setResetLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View className="w-full max-w-[700px] px-[24px] py-[32px]">
      <Text
        className="text-[24px] font-[24px] pb-[32px]"
        style={{ color: colors.textPrimary }}
      >
        {t("auth.welcomeBack", "Welcome Back")}
      </Text>

      <InputField
        label={t("auth.email", "Email")}
        icon={<EmailIcon />}
        value={formData.email}
        onChangeText={handleEmailChange}
        placeholder={t("auth.enterEmail", "Enter your email")}
        keyboardType="email-address"
        textContentType="username"
        autoComplete="username"
        inputMode="email"
        testID="email-input"
        error={errors.email}
      />

      <InputField
        label={t("auth.password", "Password")}
        icon={<PasswordIcon />}
        value={formData.password}
        onChangeText={handlePasswordChange}
        placeholder={t("auth.enterPassword", "Enter your password")}
        secureTextEntry={!showPassword}
        textContentType="password"
        rightIcon={showPassword ? <HiddenIcon /> : <ShowPasswordIcon />}
        onRightIconPress={toggleShowPassword}
        testID="password-input"
        error={errors.password}
      />

      <TouchableOpacity
        onPress={handleForgotPassword}
        activeOpacity={0.7}
        className="mb-[24px]"
      >
        <Text
          className="text-right text-[14px]"
          style={{
            fontFamily: "Roboto",
            fontWeight: "500",
            color: colors.appPrimary,
          }}
        >
          {t("auth.forgotPassword", "Forgot Password?")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="w-full rounded-[8px] items-center justify-center py-[12px] mb-[16px]"
        style={{ backgroundColor: colors.appPrimary }}
        onPress={handleSignIn}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text
            className="text-center font-[14px]"
            style={{
              fontFamily: "Roboto",
              fontWeight: "500",
              color: "#FFFFFF",
            }}
          >
            {t("common.signIn", "Sign In")}
          </Text>
        )}
      </TouchableOpacity>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          className="bg-black/50 justify-center items-center"
        >
          <View
            style={{ backgroundColor: colors.cardBackground }}
            className="w-[90%] max-w-[400px] rounded-[16px] p-[24px]"
          >
            <Text
              style={{ color: colors.textPrimary }}
              className="text-[20px] font-medium mb-[16px]"
            >
              {t("auth.resetPassword", "Reset Password")}
            </Text>

            <Text style={{ color: colors.textSecondary }} className="mb-[16px]">
              {t(
                "auth.resetPasswordInstructions",
                "Enter your email address and we'll send you instructions to reset your password."
              )}
            </Text>

            <View className="mb-[16px]">
              <Text style={{ color: colors.textPrimary }} className="mb-[8px]">
                {t("auth.email", "Email")}
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.input,
                  color: colors.textPrimary,
                  borderColor: errors.resetEmail ? colors.error : colors.border,
                }}
                className="p-[12px] rounded-[8px] border"
                placeholder={t("auth.enterEmail", "Enter your email")}
                placeholderTextColor={colors.textSecondary}
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.resetEmail && (
                <Text
                  style={{ color: colors.error }}
                  className="mt-[4px] text-[12px]"
                >
                  {errors.resetEmail}
                </Text>
              )}
            </View>

            <View className="flex-row justify-between mt-[16px]">
              <TouchableOpacity
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }}
                className="flex-1 rounded-[8px] py-[12px] items-center border mr-[8px]"
                onPress={() => setShowForgotPasswordModal(false)}
              >
                <Text style={{ color: colors.textPrimary }}>
                  {t("common.cancel", "Cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: colors.appPrimary }}
                className="flex-1 rounded-[8px] py-[12px] items-center ml-[8px]"
                onPress={handleResetPassword}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ color: "white" }}>
                    {t("auth.send", "Send")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default memo(SignInForm);

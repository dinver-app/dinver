import React, { useState, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { z } from "zod";
import { register } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";
import { registerSchema, validateFullName } from "@/utils/validation";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";
import InputField from "@/components/InputField";
import {
  UserIcon,
  EmailIcon,
  PhoneIcon,
  PasswordIcon,
  HiddenIcon,
  ShowPasswordIcon,
  CheckboxChecked,
  CheckboxUnchecked,
} from "@/assets/icons/icons";
import { router } from "expo-router";

interface SignUpFormProps {
  onSuccess?: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});
  const { setUser } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
    if (errors[field as keyof typeof errors]) {
      setErrors({
        ...errors,
        [field]: undefined,
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {
      fullName?: string;
      phoneNumber?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    if (!formData.fullName) {
      newErrors.fullName = t("auth.fullNameRequired", "Full name is required");
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = t(
        "auth.phoneNumberRequired",
        "Phone number is required"
      );
    } else if (!formData.phoneNumber.startsWith("+")) {
      newErrors.phoneNumber = t(
        "auth.phoneNumberFormat",
        "Phone must start with + and country code (e.g. +385)"
      );
    }

    try {
      const phoneRegex = /^\+[0-9]{1,3}[0-9]{6,14}$/;
      if (formData.phoneNumber && !phoneRegex.test(formData.phoneNumber)) {
        newErrors.phoneNumber = t(
          "auth.phoneNumberFormatInvalid",
          "Phone must be in format: +[country code][number]"
        );
      }

      const { firstName, lastName } = validateFullName(formData.fullName) || {};

      if (!firstName || !lastName) {
        newErrors.fullName = t(
          "auth.fullNameFormat",
          "Please enter both first and last name"
        );
      } else {
        registerSchema.parse({
          firstName,
          lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phoneNumber,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          const field = err.path[0];
          if (field === "firstName" || field === "lastName") {
            newErrors.fullName = err.message;
          } else if (field === "email") {
            newErrors.email = err.message;
          } else if (field === "password") {
            newErrors.password = err.message;
          } else if (field === "phone") {
            newErrors.phoneNumber = err.message;
          }
        });
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t(
        "auth.passwordsDontMatch",
        "Passwords do not match"
      );
    }

    if (!termsAccepted) {
      newErrors.terms = t(
        "auth.mustAgreeToTerms",
        "You must agree to the Terms of Service"
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    const { firstName, lastName } = validateFullName(formData.fullName) || {};

    if (!firstName || !lastName) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        fullName: t("auth.fullNameRequired", "Full name is required"),
      }));
      return;
    }

    setLoading(true);

    try {
      const payload = {
        firstName,
        lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phoneNumber,
      };

      const registeredUser = await register(payload);
      await setUser(registeredUser);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      if (error.response?.data?.error === "Phone number already exists") {
        setErrors((prevErrors) => ({
          ...prevErrors,
          phoneNumber: t(
            "auth.phoneAlreadyExists",
            "Phone number already exists"
          ),
        }));
      } else if (error.response?.data?.error === "Email already exists") {
        setErrors((prevErrors) => ({
          ...prevErrors,
          email: t("auth.emailAlreadyExists", "Email already exists"),
        }));
      } else if (error.response?.data?.message) {
        const field = error.response.data.field;
        if (field && field in formData) {
          setErrors((prevErrors) => ({
            ...prevErrors,
            [field]: error.response.data.message,
          }));
        } else {
          setErrors((prevErrors) => ({
            ...prevErrors,
            general: error.response.data.message,
          }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const toggleTerms = () => {
    setTermsAccepted(!termsAccepted);
    if (errors.terms) {
      setErrors({
        ...errors,
        terms: undefined,
      });
    }
  };

  return (
    <View className="w-full max-w-[700px] px-[24px] pt-[32px] mb-[200px]">
      <Text
        className="text-[24px] font-[24px] pb-[32px]"
        style={{ color: colors.textPrimary }}
      >
        {t("auth.createAccount", "Create Account")}
      </Text>

      <InputField
        label={t("auth.fullName", "Full Name")}
        icon={<UserIcon />}
        value={formData.fullName}
        onChangeText={(text) => handleInputChange("fullName", text)}
        placeholder={t("auth.enterFullName", "Enter your full name")}
        autoCapitalize="words"
        error={errors.fullName}
      />

      <InputField
        label={t("profile.phoneNumber", "Phone Number")}
        icon={<PhoneIcon />}
        value={formData.phoneNumber}
        onChangeText={(text) => handleInputChange("phoneNumber", text)}
        placeholder={t("auth.enterPhoneNumber", "Enter your phone number")}
        keyboardType="phone-pad"
        error={errors.phoneNumber}
      />

      <InputField
        label={t("auth.email", "Email")}
        icon={<EmailIcon />}
        value={formData.email}
        onChangeText={(text) => handleInputChange("email", text)}
        placeholder={t("auth.enterEmail", "Enter your email")}
        keyboardType="email-address"
        error={errors.email}
      />

      <InputField
        label={t("auth.password", "Password")}
        icon={<PasswordIcon />}
        value={formData.password}
        onChangeText={(text) => handleInputChange("password", text)}
        placeholder={t("auth.createPassword", "Create a password")}
        secureTextEntry={!showPassword}
        rightIcon={showPassword ? <HiddenIcon /> : <ShowPasswordIcon />}
        onRightIconPress={toggleShowPassword}
        error={errors.password}
      />

      <InputField
        label={t("auth.confirmPassword", "Confirm Password")}
        icon={<PasswordIcon />}
        value={formData.confirmPassword}
        onChangeText={(text) => handleInputChange("confirmPassword", text)}
        placeholder={t("auth.confirmYourPassword", "Confirm your password")}
        secureTextEntry={!showConfirmPassword}
        rightIcon={showConfirmPassword ? <HiddenIcon /> : <ShowPasswordIcon />}
        onRightIconPress={toggleShowConfirmPassword}
        error={errors.confirmPassword}
      />

      <View className="flex-row items-center mb-[24px]">
        <TouchableOpacity onPress={toggleTerms} activeOpacity={0.7}>
          {termsAccepted ? <CheckboxChecked /> : <CheckboxUnchecked />}
        </TouchableOpacity>
        <View className="flex-row flex-wrap ml-[12px]">
          <Text
            className="text-[12px]"
            style={{
              fontFamily: "Roboto",
              fontWeight: "400",
              color: colors.textSecondary,
            }}
          >
            {t("auth.iAgreeTo", "I agree to the")}{" "}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/profile/terms-of-service")}
          >
            <Text
              className="text-[12px]"
              style={{
                fontFamily: "Roboto",
                fontWeight: "400",
                color: colors.appPrimary,
              }}
            >
              {t("auth.termsOfService", "Terms of Service")}
            </Text>
          </TouchableOpacity>
          <Text
            className="text-[12px]"
            style={{
              fontFamily: "Roboto",
              fontWeight: "400",
              color: colors.textSecondary,
            }}
          >
            {" "}
            {t("auth.and", "and")}{" "}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/profile/privacy-policy")}
          >
            <Text
              className="text-[12px]"
              style={{
                fontFamily: "Roboto",
                fontWeight: "400",
                color: colors.appPrimary,
              }}
            >
              {t("auth.privacyPolicy", "Privacy Policy")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {errors.terms && (
        <Text className="text-xs mb-[24px]" style={{ color: colors.error }}>
          {errors.terms}
        </Text>
      )}

      <TouchableOpacity
        className="w-full rounded-[8px] items-center justify-center py-[12px]"
        style={{ backgroundColor: colors.appPrimary }}
        onPress={handleSignUp}
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
            {t("auth.createAccount", "Create Account")}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default memo(SignUpForm);

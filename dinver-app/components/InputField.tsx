/* eslint-disable react/display-name */
import React, { memo } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface InputFieldProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  rightIcon?: React.ReactNode;
  error?: string;
  onRightIconPress?: () => void;
  textContentType?:
    | "none"
    | "URL"
    | "addressCity"
    | "addressCityAndState"
    | "addressState"
    | "countryName"
    | "creditCardNumber"
    | "emailAddress"
    | "familyName"
    | "fullStreetAddress"
    | "givenName"
    | "jobTitle"
    | "location"
    | "middleName"
    | "name"
    | "namePrefix"
    | "nameSuffix"
    | "nickname"
    | "organizationName"
    | "postalCode"
    | "streetAddressLine1"
    | "streetAddressLine2"
    | "sublocality"
    | "telephoneNumber"
    | "username"
    | "password"
    | "newPassword"
    | "oneTimeCode";
  autoComplete?:
    | "name"
    | "nickname"
    | "username"
    | "password"
    | "tel"
    | "email"
    | "url"
    | "additional-name"
    | "address-line1"
    | "address-line2"
    | "birthdate-day"
    | "birthdate-full"
    | "birthdate-month"
    | "birthdate-year"
    | "cc-csc"
    | "cc-exp"
    | "cc-exp-month"
    | "cc-exp-year"
    | "cc-number"
    | "organization-title"
    | "organization"
    | "street-address"
    | "postal-code"
    | undefined;
  inputMode?:
    | "none"
    | "text"
    | "decimal"
    | "numeric"
    | "tel"
    | "search"
    | "email"
    | "url";
  testID?: string;
  editable?: boolean;
  inputStyle?: any;
  onPressIn?: () => void;
}

const InputField: React.FC<InputFieldProps> = memo(
  ({
    label,
    icon,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    autoCapitalize = "none",
    rightIcon,
    error,
    onRightIconPress,
    secureTextEntry = false,
    textContentType = "none",
    autoComplete,
    inputMode,
    testID,
    editable = true,
    inputStyle,
    onPressIn,
  }) => {
    const { colors } = useTheme();

    return (
      <View className="mb-[24px]">
        <Text className="mb-[8px]" style={{ color: colors.textSecondary }}>
          {label}
        </Text>
        <View className="relative">
          <View className="absolute top-[12px] left-[12px] z-10">{icon}</View>
          <TextInput
            className="w-full text-[14px] pl-[40px] pr-[40px] py-[12px] rounded-[8px]"
            style={{
              fontFamily: "Inter",
              fontWeight: "500",
              backgroundColor: colors.input,
              color: colors.textPrimary,
              ...(inputStyle || {}),
            }}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            value={value}
            onChangeText={onChangeText}
            textContentType={textContentType}
            autoComplete={autoComplete}
            secureTextEntry={secureTextEntry}
            spellCheck={false}
            inputMode={inputMode}
            testID={testID}
            editable={editable}
            onPressIn={onPressIn}
          />
          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              className="absolute top-[12.5px] right-[12px] z-10"
              activeOpacity={0.7}
            >
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>
        {error && (
          <Text className="text-xs mt-1" style={{ color: colors.error }}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

export default InputField;

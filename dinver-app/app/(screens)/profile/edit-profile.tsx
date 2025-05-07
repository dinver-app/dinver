import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { showWarning } from "@/utils/toast";

import InputField from "@/components/InputField";
import LocationSearchBar, {
  PlaceSuggestion,
  searchGooglePlaces,
} from "@/components/search/LocationSearchBar";
import { useTheme } from "@/context/ThemeContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  deleteProfileImage,
  getUserProfile,
  getUserSettings,
  getVerificationStatus,
  updateNotificationSetting,
  updateProfileField,
  uploadProfileImage,
} from "@/services/userService";
import { VerificationStatus } from "@/utils/validation";
import { ArrowBack } from "@/assets/icons/icons";

const extractAddressComponents = (
  addressDescription: string
): {
  street: string;
  city: string;
  country: string;
} => {
  const parts = addressDescription.split(", ");
  let street = parts[0] || "";
  let city = parts.length > 1 ? parts[1] : "";
  let country = parts.length > 2 ? parts[parts.length - 1] : "Hrvatska";

  if (/^\d{5}/.test(city)) {
    const cityParts = city.split(" ");
    city = cityParts.slice(1).join(" ");
  }

  return { street, city, country };
};

const AddressSuggestionItem = ({
  item,
  onSelect,
}: {
  item: PlaceSuggestion;
  onSelect: (suggestion: PlaceSuggestion) => void;
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={{ borderBottomColor: colors.border }}
      className="p-4 border-b"
      onPress={() => onSelect(item)}
      accessible={true}
      accessibilityLabel={
        t("explore.selectAddress", "Select address: ") + item.description
      }
    >
      <View className="flex-row items-center">
        <Ionicons name="location-outline" size={20} color={colors.appPrimary} />
        <Text style={{ color: colors.textPrimary }} className="ml-2">
          {item.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const EditProfileScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    streetAddress: "",
    city: "",
    country: "",
    bio: "",
    birthDate: "",
    profileImage: null as string | null,
  });

  const [originalProfile, setOriginalProfile] = useState({
    email: "",
    phone: "",
  });

  const [fullName, setFullName] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [charactersLeft, setCharactersLeft] = useState(150);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
  });
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>({
      isEmailVerified: false,
      isPhoneVerified: false,
    });

  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const [addressSearching, setAddressSearching] = useState(false);
  const debouncedAddressSearch = useDebouncedValue(addressSearchQuery, 500);

  const searchAddressSuggestions = useCallback(async (query: string) => {
    return await searchGooglePlaces(query);
  }, []);

  useEffect(() => {
    const fetchAddressSuggestions = async () => {
      if (debouncedAddressSearch.length < 3) {
        setAddressSuggestions([]);
        return;
      }

      setAddressSearching(true);
      try {
        const suggestions = await searchAddressSuggestions(
          debouncedAddressSearch
        );
        setAddressSuggestions(suggestions);
      } catch (error) {
        console.log("Error fetching address suggestions:", error);
      } finally {
        setAddressSearching(false);
      }
    };

    fetchAddressSuggestions();
  }, [debouncedAddressSearch, searchAddressSuggestions]);

  const handleSelectAddress = useCallback((suggestion: PlaceSuggestion) => {
    const { street, city, country } = extractAddressComponents(
      suggestion.description
    );

    setProfile((prev) => ({
      ...prev,
      streetAddress: street,
      city: city,
      country: country || "Hrvatska",
    }));

    setAddressModalVisible(false);
    setAddressSearchQuery("");
  }, []);

  const handleAddressPress = useCallback(() => {
    setAddressModalVisible(true);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const userProfile = await getUserProfile();
        const verificationData = await getVerificationStatus();
        setVerificationStatus(verificationData);

        setOriginalProfile({
          email: userProfile.email || "",
          phone: userProfile.phone || "",
        });

        let formattedBirthDate = "";
        if (userProfile.birthDate) {
          const parts = userProfile.birthDate.split("-");
          if (parts.length === 3) {
            formattedBirthDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
            setDate(new Date(`${userProfile.birthDate}T00:00:00`));
          }
        }

        setProfile({
          firstName: userProfile.firstName || "",
          lastName: userProfile.lastName || "",
          email: userProfile.email || "",
          phone: userProfile.phone || "",
          streetAddress: userProfile.location?.street || "",
          city: userProfile.location?.city || "",
          country: userProfile.location?.country || "",
          bio: userProfile.bio || "",
          birthDate: formattedBirthDate,
          profileImage: userProfile.profileImage ?? null,
        });

        setFullName(`${userProfile.firstName} ${userProfile.lastName}`.trim());

        const userSettings = await getUserSettings();
        if (userSettings.notifications) {
          setNotifications({
            push: userSettings.notifications.push || false,
            email: userSettings.notifications.email || false,
            sms: userSettings.notifications.sms || false,
          });
        }

        if (userProfile.bio) {
          setCharactersLeft(150 - userProfile.bio.length);
        }
      } catch (error) {
        console.log("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleProfileImagePress = async () => {
    Alert.alert(
      t("profile.changePhoto", "Change Photo"),
      t("profile.selectAction", "What would you like to do?"),
      [
        {
          text: t("profile.chooseFromLibrary", "Choose from Library"),
          onPress: selectImageFromGallery,
        },
        {
          text: t("profile.removePhoto", "Remove Photo"),
          onPress: handleRemovePhoto,
          style: profile.profileImage ? "destructive" : "default",
        },
        {
          text: t("common.cancel", "Cancel"),
          style: "cancel",
        },
      ]
    );
  };

  const selectImageFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          t("common.permissionRequired", "Permission Required"),
          t(
            "profile.galleryPermissionMessage",
            "We need access to your photos to select an image"
          )
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImageLoading(true);

        try {
          const response = await uploadProfileImage(selectedAsset.uri);
          setProfile((prev) => ({
            ...prev,
            profileImage: response.imageUrl,
          }));
        } catch (error) {
          console.log("Failed to upload image:", error);
        } finally {
          setImageLoading(false);
        }
      }
    } catch (error) {
      console.log("Error selecting image:", error);
    }
  };

  const handleRemovePhoto = async () => {
    if (!profile.profileImage) {
      return;
    }

    Alert.alert(
      t("profile.removePhoto", "Remove Photo"),
      t(
        "profile.removePhotoConfirm",
        "Are you sure you want to remove your profile photo?"
      ),
      [
        {
          text: t("common.cancel", "Cancel"),
          style: "cancel",
        },
        {
          text: t("common.remove", "Remove"),
          style: "destructive",
          onPress: async () => {
            setImageLoading(true);
            try {
              await deleteProfileImage();
              setProfile((prev) => ({
                ...prev,
                profileImage: null,
              }));
            } catch (error) {
              console.log("Failed to remove profile image:", error);
            } finally {
              setImageLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleFullNameChange = (value: string) => {
    setFullName(value);
    const nameParts = value.trim().split(" ");
    if (nameParts.length > 1) {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      setProfile((prev) => ({
        ...prev,
        firstName,
        lastName,
      }));
    } else {
      setProfile((prev) => ({
        ...prev,
        firstName: value.trim(),
        lastName: "",
      }));
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (
      field === "email" &&
      profile.email !== value &&
      originalProfile.email === profile.email &&
      verificationStatus.isEmailVerified
    ) {
      showWarning(
        t(
          "profile.emailVerifiedWarning",
          "Changing your email will require re-verification. Are you sure?"
        )
      );
    }

    if (
      field === "phone" &&
      profile.phone !== value &&
      originalProfile.phone === profile.phone &&
      verificationStatus.isPhoneVerified
    ) {
      showWarning(
        t(
          "profile.phoneVerifiedWarning",
          "Changing your phone number will require re-verification. Are you sure?"
        )
      );
    }

    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "bio") {
      setCharactersLeft(150 - value.length);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate && event.type !== "dismissed") {
      setDate(selectedDate);

      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const year = selectedDate.getFullYear();
      const formattedDate = `${day}.${month}.${year}`;

      setProfile((prev) => ({
        ...prev,
        birthDate: formattedDate,
      }));
    } else if (event.type === "dismissed") {
      setShowDatePicker(false);
    }
  };

  const getISODateFromDisplayed = (displayedDate: string) => {
    if (!displayedDate) return "";

    const parts = displayedDate.split(".");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return displayedDate;
  };

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
      setNotifications((prev) => ({ ...prev }));
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);

      const userProfile = await getUserProfile();
      if (
        profile.email !== userProfile.email &&
        verificationStatus.isEmailVerified
      ) {
        const confirmChange = await new Promise((resolve) => {
          Alert.alert(
            t("profile.confirmEmailChange", "Confirm Email Change"),
            t(
              "profile.emailVerificationLostWarning",
              "Changing your email will reset its verification status. You'll need to verify your new email again."
            ),
            [
              {
                text: t("common.cancel", "Cancel"),
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: t("common.confirm", "Confirm"),
                onPress: () => resolve(true),
              },
            ]
          );
        });

        if (!confirmChange) {
          setIsSaving(false);
          setProfile((prev) => ({ ...prev, email: userProfile.email || "" }));
          return;
        }
      }

      if (
        profile.phone !== userProfile.phone &&
        verificationStatus.isPhoneVerified
      ) {
        const confirmChange = await new Promise((resolve) => {
          Alert.alert(
            t("profile.confirmPhoneChange", "Confirm Phone Change"),
            t(
              "profile.phoneVerificationLostWarning",
              "Changing your phone number will reset its verification status. You'll need to verify your new phone again."
            ),
            [
              {
                text: t("common.cancel", "Cancel"),
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: t("common.confirm", "Confirm"),
                onPress: () => resolve(true),
              },
            ]
          );
        });

        if (!confirmChange) {
          setIsSaving(false);
          setProfile((prev) => ({ ...prev, phone: userProfile.phone || "" }));
          return;
        }
      }

      const updateOperations = [];

      if (profile.firstName !== userProfile.firstName)
        updateOperations.push({ field: "firstName", value: profile.firstName });

      if (profile.lastName !== userProfile.lastName)
        updateOperations.push({ field: "lastName", value: profile.lastName });

      if (profile.bio !== userProfile.bio)
        updateOperations.push({ field: "bio", value: profile.bio });

      if (profile.streetAddress !== userProfile.location?.street)
        updateOperations.push({
          field: "streetAddress",
          value: profile.streetAddress,
        });

      if (profile.city !== userProfile.location?.city)
        updateOperations.push({ field: "city", value: profile.city });

      if (profile.country !== userProfile.location?.country)
        updateOperations.push({ field: "country", value: profile.country });

      if (profile.phone !== userProfile.phone)
        updateOperations.push({ field: "phone", value: profile.phone });

      if (profile.email !== userProfile.email)
        updateOperations.push({ field: "email", value: profile.email });

      if (profile.birthDate) {
        const isoDate = getISODateFromDisplayed(profile.birthDate);
        updateOperations.push({ field: "birthDate", value: isoDate });
      }

      if (updateOperations.length > 0) {
        for (const op of updateOperations) {
          try {
            if (
              [
                "firstName",
                "lastName",
                "email",
                "phone",
                "streetAddress",
                "city",
                "country",
                "bio",
                "birthDate",
              ].includes(op.field)
            ) {
              await updateProfileField(
                op.field as Exclude<keyof typeof profile, "profileImage">,
                op.value
              );
            }
          } catch (error: any) {
            if (error.isHandled) {
              setIsSaving(false);
              return;
            }
            throw error;
          }
        }

        router.back();
      } else {
        router.back();
      }
    } catch (error) {
      console.log("Failed to update profile:", error);
      setIsSaving(false);
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
            {t("profile.editProfile", "Edit Profile")}
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
        <ScrollView className="flex-1">
          {isLoading ? (
            <View className="flex-1 justify-center items-center h-[80vh]">
              <ActivityIndicator size="large" color={colors.appPrimary} />
            </View>
          ) : (
            <>
              <View className="items-center my-6">
                <View className="relative">
                  {imageLoading ? (
                    <View
                      style={{ backgroundColor: "#1A1A1A" }}
                      className="w-[100px] h-[100px] rounded-full items-center justify-center"
                    >
                      <ActivityIndicator size="large" color="#10b981" />
                    </View>
                  ) : (
                    <Image
                      source={
                        profile.profileImage
                          ? { uri: profile.profileImage }
                          : require("@/assets/images/avatar.jpg")
                      }
                      style={{ width: 100, height: 100, borderRadius: 50 }}
                      contentFit="cover"
                    />
                  )}
                  <TouchableOpacity
                    style={{ backgroundColor: "#10b981" }}
                    className="absolute bottom-0 right-0 p-2 rounded-full"
                    onPress={handleProfileImagePress}
                    disabled={imageLoading}
                  >
                    <Feather name="camera" size={20} color="white" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={handleProfileImagePress}
                  disabled={imageLoading}
                >
                  <Text style={{ color: "#10b981" }} className="mt-2">
                    {t("profile.changePhoto", "Change Photo")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="px-4 mb-6">
                <Text
                  style={{ color: colors.textPrimary }}
                  className="text-xl font-medium mb-4"
                >
                  {t("profile.personalInformation", "Personal Information")}
                </Text>

                <InputField
                  label={t("profile.fullName", "Full Name")}
                  icon={<Feather name="user" size={20} color="#9CA3AF" />}
                  value={fullName}
                  onChangeText={handleFullNameChange}
                  placeholder={t(
                    "profile.enterFullName",
                    "Enter your full name"
                  )}
                  keyboardType="default"
                  autoCapitalize="words"
                />

                <InputField
                  label={t("profile.emailAddress", "Email Address")}
                  icon={
                    <MaterialIcons name="email" size={20} color="#9CA3AF" />
                  }
                  value={profile.email}
                  onChangeText={(value) => handleInputChange("email", value)}
                  placeholder={t("profile.enterEmail", "Enter your email")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <InputField
                  label={t("profile.phoneNumber", "Phone Number")}
                  icon={<Feather name="phone" size={20} color="#9CA3AF" />}
                  value={profile.phone}
                  onChangeText={(value) => handleInputChange("phone", value)}
                  placeholder={t(
                    "profile.enterPhone",
                    "Enter your phone number"
                  )}
                  keyboardType="phone-pad"
                />

                <InputField
                  label={t("profile.streetAddress", "Street Address")}
                  icon={
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#9CA3AF"
                    />
                  }
                  value={profile.streetAddress}
                  onChangeText={(value) =>
                    handleInputChange("streetAddress", value)
                  }
                  placeholder={t(
                    "profile.searchStreetAddress",
                    "Search or enter your street address"
                  )}
                  onPressIn={handleAddressPress}
                  rightIcon={
                    profile.streetAddress ? (
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    ) : (
                      <Ionicons name="search" size={18} color="#9CA3AF" />
                    )
                  }
                  onRightIconPress={
                    profile.streetAddress
                      ? () => {
                          setProfile((prev) => ({
                            ...prev,
                            streetAddress: "",
                            city: "",
                            country: "",
                          }));
                        }
                      : handleAddressPress
                  }
                />

                <InputField
                  label={t("profile.city", "City")}
                  icon={<FontAwesome5 name="city" size={16} color="#9CA3AF" />}
                  value={profile.city}
                  onChangeText={(value) => handleInputChange("city", value)}
                  placeholder={t("profile.enterCity", "Enter your city")}
                  editable={false}
                  inputStyle={{
                    backgroundColor: colors.input,
                    opacity: 0.8,
                  }}
                />

                <InputField
                  label={t("profile.country", "Country")}
                  icon={<Ionicons name="earth" size={20} color="#9CA3AF" />}
                  value={profile.country}
                  onChangeText={(value) => handleInputChange("country", value)}
                  placeholder={t("profile.enterCountry", "Enter your country")}
                  editable={false}
                  inputStyle={{
                    backgroundColor: colors.input,
                    opacity: 0.8,
                  }}
                />
              </View>

              <View className="px-4 mb-6">
                <Text
                  style={{ color: colors.textPrimary }}
                  className="text-xl font-medium mb-4"
                >
                  {t("profile.additionalInformation", "Additional Information")}
                </Text>

                <View className="mb-6">
                  <View className="flex-row justify-between items-center">
                    <Text
                      style={{ color: colors.textSecondary }}
                      className="mb-2"
                    >
                      {t("profile.bio", "Bio")} (
                      {t("profile.optional", "Optional")})
                    </Text>
                    <Text
                      style={{ color: "#9CA3AF" }}
                      className="text-xs text-right mt-1"
                    >
                      {charactersLeft}/150
                    </Text>
                  </View>
                  <View className="relative">
                    <TextInput
                      multiline
                      numberOfLines={4}
                      maxLength={150}
                      value={profile.bio || ""}
                      onChangeText={(value) => handleInputChange("bio", value)}
                      placeholder={t("profile.enterBio", "Enter your bio")}
                      placeholderTextColor="#9CA3AF"
                      style={{
                        backgroundColor: colors.input,
                        color: colors.textPrimary,
                        textAlignVertical: "top",
                        minHeight: 100,
                        width: "100%",
                        padding: 12,
                        borderRadius: 8,
                      }}
                    />
                  </View>
                </View>

                <View className="mb-6">
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="mb-2"
                  >
                    {t("profile.dateOfBirth", "Date of Birth")} (
                    {t("profile.optional", "Optional")})
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(!showDatePicker)}
                    style={{
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                    }}
                    className="flex-row items-center border rounded-lg p-3"
                  >
                    <Feather
                      name="calendar"
                      size={20}
                      color="#9CA3AF"
                      style={{ marginRight: 16 }}
                    />
                    <Text style={{ color: colors.textPrimary }}>
                      {profile.birthDate ||
                        t("profile.selectDate", "Select date")}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={date || new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </View>
              </View>

              <View className="px-4 mb-6">
                <Text
                  style={{ color: colors.textPrimary }}
                  className="text-xl font-medium mb-4"
                >
                  {t(
                    "profile.notificationPreferences",
                    "Notification Preferences"
                  )}
                </Text>

                <View
                  style={{ borderBottomColor: colors.border }}
                  className="flex-row justify-between items-center py-4 border-b"
                >
                  <View className="flex-row items-center">
                    <Feather
                      name="bell"
                      size={22}
                      color="#9CA3AF"
                      style={{ marginRight: 16 }}
                    />
                    <Text style={{ color: colors.textPrimary }}>
                      {t("profile.pushNotifications", "Push Notifications")}
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
                    <MaterialIcons
                      name="email"
                      size={22}
                      color="#9CA3AF"
                      style={{ marginRight: 16 }}
                    />
                    <Text style={{ color: colors.textPrimary }}>
                      {t("profile.emailNotifications", "Email Notifications")}
                    </Text>
                  </View>
                  <Switch
                    value={notifications.email}
                    onValueChange={() => toggleNotification("email")}
                    trackColor={{ false: "#3e3e3e", true: colors.appPrimary }}
                    thumbColor="#f4f3f4"
                  />
                </View>

                <View className="flex-row justify-between items-center py-4">
                  <View className="flex-row items-center">
                    <Feather
                      name="smartphone"
                      size={22}
                      color="#9CA3AF"
                      style={{ marginRight: 16 }}
                    />
                    <Text style={{ color: colors.textPrimary }}>
                      {t("profile.smsNotifications", "SMS Notifications")}
                    </Text>
                  </View>
                  <Switch
                    value={notifications.sms}
                    onValueChange={() => toggleNotification("sms")}
                    trackColor={{ false: "#3e3e3e", true: colors.appPrimary }}
                    thumbColor="#f4f3f4"
                  />
                </View>
              </View>

              <Modal
                visible={addressModalVisible}
                animationType="none"
                transparent={true}
                onRequestClose={() => setAddressModalVisible(false)}
              >
                <View
                  style={{
                    backgroundColor: "rgba(0,0,0,0.5)",
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                  }}
                />
                <View className="flex-1 justify-end">
                  <View
                    style={{ backgroundColor: colors.background }}
                    className="flex-1 mt-[30%] rounded-t-[20px]"
                  >
                    <View
                      style={{ borderBottomColor: colors.border }}
                      className="px-4 py-4 border-b"
                    >
                      <View className="flex-row justify-between items-center mb-4">
                        <Text
                          style={{ color: colors.textPrimary }}
                          className="text-xl font-bold"
                        >
                          {t("profile.selectAddress", "Select Address")}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setAddressModalVisible(false)}
                          accessibilityLabel={t("common.close", "Close")}
                        >
                          <Ionicons
                            name="close"
                            size={24}
                            color={colors.textPrimary}
                          />
                        </TouchableOpacity>
                      </View>
                      <LocationSearchBar
                        value={addressSearchQuery}
                        onChangeText={setAddressSearchQuery}
                        onClear={() => setAddressSearchQuery("")}
                        isSearching={addressSearching}
                        placeholder={t(
                          "explore.searchForAddress",
                          "Search for an address"
                        )}
                      />
                      <Text
                        style={{ color: colors.textSecondary }}
                        className="mt-2 text-sm"
                      >
                        {t(
                          "profile.addressSearchInfo",
                          "Search for your address to automatically fill city and country fields"
                        )}
                      </Text>
                    </View>
                    {addressSearching ? (
                      <View className="flex-1 justify-center items-center">
                        <ActivityIndicator
                          size="large"
                          color={colors.appPrimary}
                        />
                      </View>
                    ) : (
                      <FlatList
                        data={addressSuggestions}
                        keyExtractor={(item) => item.placeId}
                        renderItem={({ item }) => (
                          <AddressSuggestionItem
                            item={item}
                            onSelect={handleSelectAddress}
                          />
                        )}
                        ListEmptyComponent={
                          addressSearchQuery.length > 2 ? (
                            <View className="p-4 items-center">
                              <Text
                                style={{ color: colors.textSecondary }}
                                className="text-center"
                              >
                                {t(
                                  "explore.noAddressesFound",
                                  "No addresses found"
                                )}
                              </Text>
                            </View>
                          ) : (
                            <View className="p-4">
                              <Text
                                style={{ color: colors.textSecondary }}
                                className="text-center"
                              >
                                {t(
                                  "explore.typeAtLeast3Chars",
                                  "Type at least 3 characters to search for locations"
                                )}
                              </Text>
                            </View>
                          )
                        }
                      />
                    )}
                  </View>
                </View>
              </Modal>

              <View className="pb-24" />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView
        style={{
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        }}
        className="absolute bottom-0 left-0 right-0 border-t"
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
            onPress={handleSaveChanges}
            disabled={isSaving}
            style={{ backgroundColor: colors.appPrimary }}
            className="flex-1 items-center py-[12px] rounded-[12px]"
          >
            <Text style={{ color: "white" }} className="font-medium">
              {isSaving
                ? t("common.saving", "Saving...")
                : t("common.saveChanges", "Save Changes")}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default EditProfileScreen;

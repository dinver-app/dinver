import { useState, useEffect } from "react";
import {
  updateRestaurant,
  deleteRestaurantThumbnail,
} from "../../services/restaurantService";
import { Restaurant } from "../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { translateText } from "../../services/translateService";
import TranslateButton from "../../components/TranslateButton";

interface GeneralTabProps {
  restaurant: Restaurant;
  onUpdate: (updatedRestaurant: Restaurant) => void;
}

interface Translation {
  language: string;
  name: string;
  description: string;
}

const GeneralTab = ({ restaurant, onUpdate }: GeneralTabProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: restaurant.name || "",
    thumbnail: restaurant.thumbnail || "",
    thumbnailUrl: restaurant.thumbnailUrl || "",
    address: restaurant.address || "",
    place: restaurant.place || "",
    country: restaurant.country || "",
    websiteUrl: restaurant.websiteUrl || "",
    fbUrl: restaurant.fbUrl || "",
    igUrl: restaurant.igUrl || "",
    ttUrl: restaurant.ttUrl || "",
    phone: restaurant.phone || "",
    email: restaurant.email || "",
    oib: restaurant.oib || "",
    wifiSsid: restaurant.wifiSsid || "",
    wifiPassword: restaurant.wifiPassword || "",
    showWifiCredentials: restaurant.showWifiCredentials || false,
    reservationEnabled: restaurant.reservationEnabled || false,
    subdomain: restaurant.subdomain || "",
    virtualTourUrl: restaurant.virtualTourUrl || "",
  });

  const [translations, setTranslations] = useState<Translation[]>([
    {
      language: "hr",
      name: restaurant.name || "",
      description:
        restaurant.translations?.find((t) => t.language === "hr")
          ?.description ||
        restaurant.description ||
        "",
    },
    {
      language: "en",
      name: restaurant.name || "",
      description:
        restaurant.translations?.find((t) => t.language === "en")
          ?.description || "",
    },
  ]);

  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState({
    websiteUrl: "",
    fbUrl: "",
    igUrl: "",
    ttUrl: "",
    phone: "",
    description: "",
  });
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState(t("all_changes_saved"));
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const validateInput = (name: string, value: string) => {
    let error = "";
    const urlPattern = new RegExp(
      "^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$",
      "i"
    );
    const phonePattern = /^\+?[0-9\s]{7,20}$/;

    if (value.trim() === "") {
      // Skip validation if the value is empty
      error = "";
    } else if (name.includes("url") && !urlPattern.test(value)) {
      error = t("please_enter_a_valid_url");
    } else if (name === "phone" && !phonePattern.test(value)) {
      error = t("please_enter_a_valid_phone_number");
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    validateInput(name, value);
    setIsDirty(true);
  };

  const handleTranslationChange = (
    language: string,
    field: string,
    value: string
  ) => {
    if (field === "description" && value.length > 150) {
      setErrors((prev) => ({
        ...prev,
        description: t("description_too_long"),
      }));
      return;
    }

    setTranslations((prev) =>
      prev.map((translation) =>
        translation.language === language
          ? { ...translation, [field]: value }
          : translation
      )
    );
    setIsDirty(true);
  };

  const handleTranslate = async (language: string, field: "description") => {
    try {
      const sourceText =
        translations.find((t) => t.language === language)?.[field] || "";

      if (!sourceText.trim()) {
        toast.error(t("nothing_to_translate"));
        return;
      }

      const targetLang = language === "hr" ? "en" : "hr";
      const translatedText = await translateText(sourceText, targetLang);

      setTranslations((prev) =>
        prev.map((translation) =>
          translation.language === targetLang
            ? { ...translation, [field]: translatedText }
            : translation
        )
      );

      toast.success(t("translation_success"));
    } catch (error) {
      toast.error(t("translation_failed"));
    }
  };

  const handleSave = async () => {
    setSaveStatus(t("saving"));
    const toastId = toast.loading(t("saving_changes"));
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("restaurantId", restaurant.id || "");
      formDataToSend.append("name", formData.name);
      formDataToSend.append("address", formData.address);
      formDataToSend.append("place", formData.place);
      formDataToSend.append("country", formData.country);
      formDataToSend.append("oib", formData.oib);
      formDataToSend.append(
        "websiteUrl",
        errors.websiteUrl === "" ? formData.websiteUrl : ""
      );
      formDataToSend.append("fbUrl", errors.fbUrl === "" ? formData.fbUrl : "");
      formDataToSend.append("igUrl", errors.igUrl === "" ? formData.igUrl : "");
      formDataToSend.append("ttUrl", errors.ttUrl === "" ? formData.ttUrl : "");
      formDataToSend.append("phone", errors.phone === "" ? formData.phone : "");
      formDataToSend.append("email", formData.email);
      formDataToSend.append("wifiSsid", formData.wifiSsid);
      formDataToSend.append("wifiPassword", formData.wifiPassword);
      formDataToSend.append(
        "showWifiCredentials",
        formData.showWifiCredentials.toString()
      );
      formDataToSend.append(
        "reservationEnabled",
        formData.reservationEnabled.toString()
      );
      formDataToSend.append("subdomain", formData.subdomain);
      formDataToSend.append("virtualTourUrl", formData.virtualTourUrl);
      if (file) {
        formDataToSend.append("thumbnail", file);
      }

      // Add translations as a JSON string
      const translationsToSend = translations.map((t) => ({
        language: t.language,
        name: formData.name, // Use the main name for both languages
        description: t.description,
      }));
      formDataToSend.append("translations", JSON.stringify(translationsToSend));

      await updateRestaurant(restaurant.id || "", formDataToSend);
      onUpdate({ ...restaurant, ...formData, translations });

      // Show success toast
      toast.success(t("changes_saved_successfully"), { id: toastId });
      setSaveStatus(t("all_changes_saved"));
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save restaurant details", error);
      // Show error toast
      toast.error(t("failed_to_save_changes"), { id: toastId });
      setSaveStatus(t("failed_to_save_changes"));
    }
  };

  const handleDeleteThumbnail = async () => {
    setIsDeleting(true);
    try {
      await deleteRestaurantThumbnail(restaurant.id || "");
      setFormData((prev) => ({
        ...prev,
        thumbnail: "",
        thumbnailUrl: "",
      }));
      onUpdate({ ...restaurant, thumbnail: "", thumbnailUrl: "" });
      toast.success(t("thumbnail_deleted_successfully"));
    } catch (error) {
      toast.error(t("failed_to_delete_thumbnail"));
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  useEffect(() => {
    Object.entries(formData).forEach(([name, value]) => {
      if (typeof value === "string") {
        validateInput(name, value);
      }
    });
  }, []);

  return (
    <div className="flex flex-col">
      {/* Header with title and save status */}
      <div className="border-b border-gray-200 pb-5 mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          {t("general_information")}
        </h2>
        <div className="flex items-center">
          {saveStatus === t("saving") ? (
            <span className="text-sm text-amber-600 flex items-center">
              <svg
                className="animate-spin h-4 w-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {saveStatus}
            </span>
          ) : saveStatus === t("failed_to_save_changes") ? (
            <span className="text-sm text-red-600 flex items-center">
              <svg
                className="h-4 w-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                ></path>
              </svg>
              {saveStatus}
            </span>
          ) : !isDirty ? (
            <span className="text-sm text-green-600 flex items-center">
              <svg
                className="h-4 w-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                ></path>
              </svg>
              {saveStatus}
            </span>
          ) : (
            <span className="text-sm text-amber-600 flex items-center">
              {t("unsaved_changes")}
            </span>
          )}
          <button onClick={handleSave} className="secondary-button ml-4">
            {t("save")}
          </button>
        </div>
      </div>

      {/* Content sections */}
      <div className="space-y-8">
        {/* Basic Information */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {t("basic_information")}
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("name")}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OIB
                </label>
                <input
                  type="text"
                  name="oib"
                  value={formData.oib}
                  onChange={handleInputChange}
                  placeholder="12345678901"
                  pattern="[0-9]{11}"
                  title="OIB mora imati točno 11 znamenki"
                  className="block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Translations */}
            <div className="space-y-4">
              {translations.map((translation) => (
                <div key={translation.language}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      {t("restaurant_description")} (
                      {translation.language.toUpperCase()})
                    </label>
                    <TranslateButton
                      onClick={() =>
                        handleTranslate(translation.language, "description")
                      }
                      className="ml-2"
                    />
                  </div>
                  <textarea
                    value={translation.description}
                    onChange={(e) =>
                      handleTranslationChange(
                        translation.language,
                        "description",
                        e.target.value
                      )
                    }
                    placeholder={t("restaurant_description_placeholder")}
                    className="block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
                    maxLength={150}
                  />
                  <div className="flex justify-between mt-1">
                    {errors.description && (
                      <p className="text-sm text-red-500">
                        {errors.description}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 ml-auto">
                      {translation.description.length}/150
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WiFi Settings */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">
              {t("wifi_settings")}
            </h3>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-3">
                {t("show_wifi_credentials")}
              </span>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.showWifiCredentials ? "bg-blue-600" : "bg-gray-200"
                }`}
                role="switch"
                aria-checked={formData.showWifiCredentials}
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    showWifiCredentials: !prev.showWifiCredentials,
                  }));
                  setIsDirty(true);
                }}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.showWifiCredentials
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("wifi_network_name")} (SSID)
                </label>
                <input
                  type="text"
                  name="wifiSsid"
                  value={formData.wifiSsid}
                  onChange={handleInputChange}
                  className="block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("wifi_password")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="wifiPassword"
                    value={formData.wifiPassword}
                    onChange={handleInputChange}
                    className="block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {t("wifi_credentials_info")}
            </p>
          </div>
        </div>

        {/* Reservation Settings */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">
              {t("reservation_settings")}
            </h3>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-3">
                {t("enable_reservations")}
              </span>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.reservationEnabled ? "bg-blue-600" : "bg-gray-200"
                }`}
                role="switch"
                aria-checked={formData.reservationEnabled}
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    reservationEnabled: !prev.reservationEnabled,
                  }));
                  setIsDirty(true);
                }}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.reservationEnabled
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-500 mt-2">
              {t("reservation_settings_info")}
            </p>
          </div>
        </div>

        {/* Thumbnail */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {t("thumbnail")}
          </h3>

          <p className="text-sm text-gray-500 mb-3">
            {t("recommendation")}: 16:9 {t("landscape")} ({t("horizontal")}){" "}
            {t("image")} (1280×720 px)
          </p>

          {formData.thumbnailUrl ? (
            <div className="inline-block">
              <div className="relative group w-64 h-36">
                <img
                  src={formData.thumbnailUrl}
                  alt="Thumbnail"
                  className="w-full h-full object-cover rounded-md shadow-sm"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                      onClick={() =>
                        document.getElementById("fileInput")?.click()
                      }
                    >
                      {t("change")}
                    </button>
                    <button
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      {t("delete")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="w-64 h-36 border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer rounded-md hover:bg-gray-100 transition-colors"
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <svg
                className="w-8 h-8 text-gray-400 mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
              <span className="text-sm text-gray-500">
                {t("click_to_add_image")}
              </span>
            </div>
          )}

          <input
            id="fileInput"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setFile(e.target.files[0]);
                const reader = new FileReader();
                reader.onload = (event) => {
                  setFormData((prev) => ({
                    ...prev,
                    thumbnailUrl: event.target?.result as string,
                  }));
                };
                reader.readAsDataURL(e.target.files[0]);
              }
            }}
          />
        </div>

        {/* Subdomain */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subdomain
          </label>
          <input
            type="text"
            name="subdomain"
            value={formData.subdomain}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            placeholder="npr. tavernaalinea"
            pattern="^[a-z0-9-]{3,}$"
            title="Dozvoljena su mala slova, brojevi i crtice (min 3 znaka)"
          />
          <p className="text-xs text-gray-500 mt-1">
            npr. tavernaalinea &rarr; https://tavernaalinea.dinver.eu
          </p>
        </div>

        {/* Virtual Tour URL */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Virtual Tour URL
          </label>
          <input
            type="text"
            name="virtualTourUrl"
            value={formData.virtualTourUrl}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            placeholder="https://www.google.com/maps/embed?pb=..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {t("virtual_tour_url_info")}
          </p>
        </div>

        {/* Location Information */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {t("location")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("address")}
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("place")}
              </label>
              <input
                type="text"
                name="place"
                value={formData.place}
                onChange={handleInputChange}
                className="block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("country")}
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {t("contact_information")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("email")}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("phone")}
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("website_url")}
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md py-2.5 px-3">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    ></path>
                  </svg>
                </span>
                <input
                  type="text"
                  name="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={handleInputChange}
                  className="flex-1 block w-full p-2.5 border border-gray-300 rounded-r-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.websiteUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.websiteUrl}</p>
              )}
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {t("social_media")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("facebook_url")}
              </label>
              <div className="flex items-center">
                <span className="text-blue-600 bg-blue-50 border border-r-0 border-blue-200 rounded-l-md py-2.5 px-3">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="fbUrl"
                  value={formData.fbUrl}
                  onChange={handleInputChange}
                  className="flex-1 block w-full p-2.5 border border-gray-300 rounded-r-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.fbUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.fbUrl}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("instagram_url")}
              </label>
              <div className="flex items-center">
                <span className="text-pink-600 bg-pink-50 border border-r-0 border-pink-200 rounded-l-md py-2.5 px-3">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913a5.885 5.885 0 001.384 2.126A5.868 5.868 0 004.14 23.37c.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558a5.898 5.898 0 002.126-1.384 5.86 5.86 0 001.384-2.126c.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913a5.89 5.89 0 00-1.384-2.126A5.847 5.847 0 0019.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227a3.81 3.81 0 01-.899 1.382 3.744 3.744 0 01-1.38.896c-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421a3.716 3.716 0 01-1.379-.899 3.644 3.644 0 01-.9-1.38c-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 01-2.88 0 1.44 1.44 0 012.88 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="igUrl"
                  value={formData.igUrl}
                  onChange={handleInputChange}
                  className="flex-1 block w-full p-2.5 border border-gray-300 rounded-r-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.igUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.igUrl}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("tiktok_url")}
              </label>
              <div className="flex items-center">
                <span className="text-gray-900 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md py-2.5 px-3">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </span>
                <input
                  type="text"
                  name="ttUrl"
                  value={formData.ttUrl}
                  onChange={handleInputChange}
                  className="flex-1 block w-full p-2.5 border border-gray-300 rounded-r-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.ttUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.ttUrl}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <svg
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3 text-gray-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <div>
                <h2 className="text-lg font-semibold">
                  {t("delete_thumbnail")}
                </h2>
                <p className="text-sm text-gray-500">
                  {t("are_you_sure_you_want_to_delete_this_image")}
                </p>
              </div>
            </div>
            <div className="h-line mb-4"></div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteThumbnail}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? t("deleting") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralTab;

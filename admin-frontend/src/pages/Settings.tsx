import { useEffect, useState } from "react";
import { updateUserLanguage, getUserLanguage } from "../services/userService";
import { toast } from "react-hot-toast";
import i18n from "i18next";
import { useTranslation } from "react-i18next";

const Settings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("general");
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  useEffect(() => {
    fetchUserLanguage();
  }, []);

  const fetchUserLanguage = async () => {
    try {
      const { language } = await getUserLanguage();
      setSelectedLanguage(language);
    } catch (error: any) {
      console.error("Failed to fetch user language", error);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleLanguageChange = async (language: string) => {
    try {
      await updateUserLanguage(language);
      setSelectedLanguage(language);
      localStorage.setItem("language", language);
      i18n.changeLanguage(language);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">{t("settings")}</h1>
        <h3 className="page-subtitle">{t("manage_your_account_settings")}</h3>
      </div>
      <div className="h-line mb-4"></div>
      <div className="flex mb-6">
        <button
          onClick={() => handleTabChange("general")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "general"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          {t("general_settings")}
        </button>
      </div>

      {activeTab === "general" && (
        <div className="flex flex-col gap-1">
          <h2 className="section-title">{t("general_settings")}</h2>
          <h3 className="section-subtitle">
            {t("general_settings_content_goes_here")}
          </h3>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              {t("language")}
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="mt-1 block w-48 p-2 border border-gray-300 rounded outline-gray-300"
            >
              <option value="en">English</option>
              <option value="hr">Hrvatski</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

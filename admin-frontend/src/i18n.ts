import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";

const getValidLanguage = () => {
  const lang = localStorage.getItem("language");
  if (
    !lang ||
    typeof lang !== "string" ||
    lang.trim() === "" ||
    !["en", "hr"].includes(lang)
  ) {
    return "en";
  }
  return lang;
};

const savedLanguage = getValidLanguage();

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    lng: savedLanguage,
    backend: {
      loadPath: "/locales/{{lng}}/translation.json",
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

import { LANGUAGES } from "@/i18n";
import { getUserSettings, updateLanguage } from "@/services/userService";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  isLanguageLoading: boolean;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language);
  const [isLanguageLoading, setIsLanguageLoading] = useState<boolean>(false);
  const isLoadingLanguageRef = useRef(false);

  const loadUserLanguage = useCallback(async () => {
    if (isLoadingLanguageRef.current) return;

    try {
      isLoadingLanguageRef.current = true;

      setTimeout(() => {
        setIsLanguageLoading(true);
      }, 0);

      if (user) {
        try {
          const userSettings = await getUserSettings();
          if (userSettings.language) {
            await i18n.changeLanguage(userSettings.language);
            setTimeout(() => {
              setCurrentLanguage(userSettings.language || LANGUAGES.EN);
              setIsLanguageLoading(false);
            }, 0);
            return;
          }
        } catch (error) {
          console.error("Failed to load user language settings:", error);
        }
      }

      await i18n.changeLanguage(LANGUAGES.EN);
      setTimeout(() => {
        setCurrentLanguage(LANGUAGES.EN);
        setIsLanguageLoading(false);
      }, 0);
    } catch (error) {
      console.error("Failed to load language preference:", error);
      await i18n.changeLanguage(LANGUAGES.EN);
      setTimeout(() => {
        setCurrentLanguage(LANGUAGES.EN);
        setIsLanguageLoading(false);
      }, 0);
    } finally {
      isLoadingLanguageRef.current = false;
    }
  }, [i18n, user]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUserLanguage();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loadUserLanguage, user]);

  const changeLanguage = async (lang: string) => {
    if (isLoadingLanguageRef.current) return;

    try {
      isLoadingLanguageRef.current = true;
      setIsLanguageLoading(true);

      await i18n.changeLanguage(lang);
      setCurrentLanguage(lang);

      if (user) {
        try {
          await updateLanguage(lang);
        } catch (updateError) {
          console.error(
            "Failed to update language in user settings:",
            updateError
          );
        }
      }
    } catch (error) {
      console.error("Failed to change language:", error);
    } finally {
      setIsLanguageLoading(false);
      isLoadingLanguageRef.current = false;
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        isLanguageLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

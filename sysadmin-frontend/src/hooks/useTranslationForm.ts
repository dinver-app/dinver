import { useState } from "react";
import { Language } from "../interfaces/Interfaces";

export const useTranslationForm = (
  initialTranslations?: Record<Language, string>
) => {
  const [activeTab, setActiveTab] = useState<Language>(Language.HR);
  const [translations, setTranslations] = useState<Record<Language, string>>(
    initialTranslations || { [Language.HR]: "", [Language.EN]: "" }
  );

  return {
    activeTab,
    setActiveTab,
    translations,
    setTranslations,
  };
};

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
const LoadingScreen = () => {
  const [dots, setDots] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prevDots) => (prevDots.length < 3 ? prevDots + "." : ""));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#1E3329] z-50">
      <div className="text-center">
        <img
          src="/images/logo_big_primary.svg"
          alt="Logo"
          className="h-16 mb-4"
        />
        <p className="text-[#FFF5C4] text-md">
          {t("loading_data")}
          {dots}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;

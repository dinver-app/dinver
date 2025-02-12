import { useTranslation } from "react-i18next";

const Home = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center mt-36">
      <h1 className="text-3xl font-bold mb-4">{t("welcome_message")}</h1>
      <p className="text-lg">{t("homepage_description")}</p>
    </div>
  );
};

export default Home;

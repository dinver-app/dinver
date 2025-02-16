import { useTranslation } from "react-i18next";

interface HomeProps {
  currentRestaurant: { id: string; name: string; slug: string } | null;
}

const Home = ({ currentRestaurant }: HomeProps) => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-screen flex flex-col justify-between pb-6">
      <div className="flex flex-col items-center mt-36">
        <h1 className="text-3xl font-bold mb-4">{t("welcome_message")}</h1>
        <p className="text-lg">{t("homepage_description")}</p>
        {currentRestaurant && (
          <div className="mt-4 text-center">
            <h2 className="text-xl font-semibold">
              {t("current_restaurant")}: {currentRestaurant.name}
            </h2>
            <p className="text-sm text-gray-500">{t("managing_restaurant")}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col items-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Dinver</h2>
        <div className="w-24 border-t border-gray-300 mb-2"></div>
        <p className="text-sm italic mb-4">"Your favorite dining solution"</p>
        <div className="flex space-x-4">
          <a href="#" className="hover:opacity-75">
            <img
              src="/images/facebook.svg"
              alt="Facebook"
              className="w-6 h-6"
            />
          </a>
          <a href="#" className="hover:opacity-75">
            <img
              src="/images/instagram.svg"
              alt="Instagram"
              className="w-6 h-6"
            />
          </a>
          <a href="#" className="hover:opacity-75">
            <img
              src="/images/linkedin.svg"
              alt="LinkedIn"
              className="w-6 h-6"
            />
          </a>
          <a href="#" className="hover:opacity-75">
            <img src="/images/tumblr.svg" alt="Tumblr" className="w-6 h-6" />
          </a>
          <a href="#" className="hover:opacity-75">
            <img
              src="/images/whatsapp.svg"
              alt="WhatsApp"
              className="w-6 h-6"
            />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Home;

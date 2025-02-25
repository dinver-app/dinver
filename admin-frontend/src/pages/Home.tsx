import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRole } from "../context/RoleContext";
import { getUserRole } from "../services/adminService";
import LoadingScreen from "../components/LoadingScreen";

const Home = () => {
  const { t } = useTranslation();
  const { setRole } = useRole();
  const [isLoading, setIsLoading] = useState(true);
  const userName = localStorage.getItem("admin_user_name");

  useEffect(() => {
    const fetchUserRole = async () => {
      const storedRestaurant = localStorage.getItem("currentRestaurant");
      if (storedRestaurant) {
        const { id: restaurantId } = JSON.parse(storedRestaurant);
        try {
          const userRole = await getUserRole(restaurantId);
          setRole(userRole);
        } catch (error) {
          console.error("Failed to fetch user role", error);
        }
      }
      setIsLoading(false);
    };

    fetchUserRole();
  }, [setRole]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="w-full h-screen flex flex-col justify-between pb-6">
      <div className="flex flex-col items-center mt-36">
        <h1 className="text-3xl font-bold mb-4">
          {userName
            ? t("welcome_name") + " " + userName.split(" ")[0]
            : t("welcome_message")}
        </h1>
        <p className="text-lg">{t("homepage_description")}</p>
      </div>
      <div className="flex flex-col items-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Dinver</h2>
        <div className="w-24 border-t border-gray-300 mb-2"></div>
        <p className="text-sm italic mb-4">
          "{t("your_favorite_dining_solution")}"
        </p>
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

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getRestaurantDetails } from "../../services/restaurantService";
import toast from "react-hot-toast";
import { Restaurant } from "../../interfaces/Interfaces";
import GeneralTab from "./GeneralTab";
import MenuTab from "./MenuTab";
import DrinkTab from "./DrinkTab";
import WorkingHoursTab from "./WorkingHoursTab";
import FiltersTab from "./FiltersTab";
import { useTranslation } from "react-i18next";
import Images from "./Images";

const RestaurantDetails = () => {
  const { slug } = useParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [activeTab, setActiveTab] = useState("General");
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [nextTab, setNextTab] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        if (!slug) {
          toast.error("Restaurant slug is required");
          return;
        }
        const loadingToastId = toast.loading(t("loading"));
        const data = await getRestaurantDetails(slug);
        toast.dismiss(loadingToastId);
        setRestaurant(data);
      } catch (error) {
        console.error("Failed to fetch restaurant details", error);
        toast.error("Failed to fetch restaurant details");
      }
    };

    fetchRestaurantDetails();
  }, [slug]);

  const handleUpdate = (updatedRestaurant: Restaurant) => {
    setRestaurant(updatedRestaurant);
  };

  const handleTabChange = (tab: string) => {
    if (activeTab === "General" && restaurant && restaurant.isDirty) {
      setNextTab(tab);
      setShowUnsavedModal(true);
    } else {
      setActiveTab(tab);
    }
  };

  const confirmTabChange = () => {
    if (nextTab) {
      setActiveTab(nextTab);
      setShowUnsavedModal(false);
    }
  };

  const renderTabContent = () => {
    if (restaurant) {
      switch (activeTab) {
        case "General":
          return <GeneralTab restaurant={restaurant} onUpdate={handleUpdate} />;
        case "Menu":
          return <MenuTab restaurantId={restaurant.id} />;
        case "Drinks":
          return <DrinkTab restaurantId={restaurant.id} />;
        case "Filters":
          return <FiltersTab restaurant={restaurant} onUpdate={handleUpdate} />;
        case "Working Hours":
          return (
            <WorkingHoursTab restaurant={restaurant} onUpdate={handleUpdate} />
          );
        case "Images":
          return <Images restaurant={restaurant} onUpdate={handleUpdate} />;
        default:
          return null;
      }
    }
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold">{restaurant?.name}</h1>
      </div>
      <div className="h-line mb-4"></div>
      <div className="tabs flex mb-4">
        <button
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "General"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
          onClick={() => handleTabChange("General")}
        >
          {t("general")}
        </button>
        <button
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "Menu" ? "border-b-2 border-black" : "text-gray-500"
          }`}
          onClick={() => handleTabChange("Menu")}
        >
          {t("menu")}
        </button>
        <button
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "Drinks" ? "border-b-2 border-black" : "text-gray-500"
          }`}
          onClick={() => handleTabChange("Drinks")}
        >
          {t("drinks")}
        </button>
        <button
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "Filters"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
          onClick={() => handleTabChange("Filters")}
        >
          {t("filters")}
        </button>
        <button
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "Working Hours"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
          onClick={() => handleTabChange("Working Hours")}
        >
          {t("working_hours")}
        </button>
        <button
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "Images" ? "border-b-2 border-black" : "text-gray-500"
          }`}
          onClick={() => handleTabChange("Images")}
        >
          {t("images")}
        </button>
      </div>
      <div className="tab-content">{renderTabContent()}</div>

      {showUnsavedModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4">{t("unsaved_changes")}</h2>
            <p className="mb-4">
              {t("you_have_unsaved_changes_are_you_sure_you_want_to_leave")}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="mr-2 py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                {t("cancel")}
              </button>
              <button
                onClick={confirmTabChange}
                className="py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                {t("leave")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetails;

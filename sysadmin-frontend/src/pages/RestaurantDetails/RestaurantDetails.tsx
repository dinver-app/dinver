import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRestaurantDetails } from "../../services/restaurantService";
import toast from "react-hot-toast";
import { Restaurant } from "../../interfaces/Interfaces";
import GeneralTab from "./GeneralTab";
import MenuTab from "./MenuTab";
import WorkingHoursTab from "./WorkingHoursTab";
import FiltersTab from "./FiltersTab";

const RestaurantDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [activeTab, setActiveTab] = useState("General");
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [nextTab, setNextTab] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        if (!slug) {
          toast.error("Restaurant slug is required");
          return;
        }
        const data = await getRestaurantDetails(slug);
        setRestaurant(data);
      } catch (error) {
        console.error("Failed to fetch restaurant details", error);
        toast.error("Failed to fetch restaurant details");
      }
    };

    fetchRestaurantDetails();
  }, [slug]);

  if (!restaurant) {
    return <div>Loading...</div>;
  }

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
    switch (activeTab) {
      case "General":
        return <GeneralTab restaurant={restaurant} onUpdate={handleUpdate} />;
      case "Menu":
        return <MenuTab />;
      case "Filters":
        return <FiltersTab restaurant={restaurant} onUpdate={handleUpdate} />;
      case "Working Hours":
        return (
          <WorkingHoursTab restaurant={restaurant} onUpdate={handleUpdate} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex justify-between items-center mb-4 gap-4">
        <button
          onClick={() => navigate("/restaurants")}
          className="secondary-button"
        >
          &larr; Back to Restaurants
        </button>
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
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
          General
        </button>
        <button
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "Menu" ? "border-b-2 border-black" : "text-gray-500"
          }`}
          onClick={() => handleTabChange("Menu")}
        >
          Menu
        </button>
        <button
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "Filters"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
          onClick={() => handleTabChange("Filters")}
        >
          Filters
        </button>
        <button
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "Working Hours"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
          onClick={() => handleTabChange("Working Hours")}
        >
          Working Hours
        </button>
      </div>
      <div className="tab-content">{renderTabContent()}</div>

      {showUnsavedModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Unsaved Changes</h2>
            <p className="mb-4">
              You have unsaved changes. Are you sure you want to leave?
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="mr-2 py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmTabChange}
                className="py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantDetails;

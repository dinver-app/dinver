import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRestaurantDetails } from "../../services/restaurantService";
import toast from "react-hot-toast";
import { Restaurant } from "../../interfaces/Interfaces";
import GeneralTab from "./GeneralTab";
import MenuTab from "./MenuTab";
import WorkingHoursTab from "./WorkingHoursTab";

const RestaurantDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [activeTab, setActiveTab] = useState("General");

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

  const renderTabContent = () => {
    switch (activeTab) {
      case "General":
        return <GeneralTab restaurant={restaurant} onUpdate={handleUpdate} />;
      case "Menu":
        return <MenuTab />;
      case "Working Hours":
        return <WorkingHoursTab />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
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
          onClick={() => setActiveTab("General")}
        >
          General
        </button>
        <button
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "Menu" ? "border-b-2 border-black" : "text-gray-500"
          }`}
          onClick={() => setActiveTab("Menu")}
        >
          Menu
        </button>
        <button
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "Working Hours"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("Working Hours")}
        >
          Working Hours
        </button>
      </div>
      <div className="tab-content">{renderTabContent()}</div>
    </div>
  );
};

export default RestaurantDetails;

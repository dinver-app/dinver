import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRestaurantDetails } from "../services/restaurantService";
import toast from "react-hot-toast";
import GeneralTab from "./RestaurantDetails/GeneralTab";
import { Restaurant } from "../interfaces/Interfaces";

const RestaurantDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [activeTab, setActiveTab] = useState("General");

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      try {
        if (!slug) {
          throw new Error("Restaurant slug is required");
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

  const handleUpdate = (updatedRestaurant: Restaurant) => {
    setRestaurant(updatedRestaurant);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "General":
        return restaurant ? (
          <GeneralTab restaurant={restaurant} onUpdate={handleUpdate} />
        ) : null;
      case "Menu":
        return <div>Menu details will be displayed here.</div>;
      case "Working Hours":
        return <div>Working hours information will be displayed here.</div>;
      default:
        return null;
    }
  };

  if (!restaurant) {
    return <div>Loading...</div>;
  }

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
      <div className="tabs flex space-x-4 mb-4">
        <button
          className={`tab ${activeTab === "General" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("General")}
        >
          General
        </button>
        <button
          className={`tab ${activeTab === "Menu" ? "active-tab" : ""}`}
          onClick={() => setActiveTab("Menu")}
        >
          Menu
        </button>
        <button
          className={`tab ${activeTab === "Working Hours" ? "active-tab" : ""}`}
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

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRestaurantDetails } from "../services/restaurantService";
import toast from "react-hot-toast";
import { Restaurant } from "../interfaces/Interfaces";

const RestaurantDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

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
      <div className="tabs">
        <button className="tab">General</button>
        <button className="tab">Settings</button>
        <button className="tab">Analytics</button>
      </div>
      <div className="tab-content">{/* Add content for each tab here */}</div>
    </div>
  );
};

export default RestaurantDetails;

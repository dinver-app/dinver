import React, { createContext, useContext, useState, useEffect } from "react";
import { getAdminRestaurants, getUserRole } from "../services/adminService";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  offer?: string;
  subdomain?: string;
}

interface AdminContextType {
  restaurants: Restaurant[];
  currentRestaurant: Restaurant | null;
  setCurrentRestaurant: (restaurant: Restaurant | null) => void;
  role: string | null;
  userName: string | null;
  setUserName: (name: string | null) => void;
  refreshRestaurants: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentRestaurant, setCurrentRestaurantState] =
    useState<Restaurant | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Fetch restaurants and set currentRestaurant
  const refreshRestaurants = async () => {
    const data = await getAdminRestaurants();
    setRestaurants(data);
    let stored = localStorage.getItem("currentRestaurant");
    let restaurant: Restaurant | null = null;
    if (stored) {
      restaurant = JSON.parse(stored);
    } else if (data.length > 0) {
      restaurant = {
        id: data[0].id,
        name: data[0].name,
        slug: data[0].slug,
        offer: data[0].offer,
        subdomain: data[0].subdomain,
      };
      localStorage.setItem("currentRestaurant", JSON.stringify(restaurant));
    }
    setCurrentRestaurantState(restaurant);
  };

  // On mount, fetch restaurants and userName
  useEffect(() => {
    refreshRestaurants();
    setUserName(localStorage.getItem("admin_user_name"));
  }, []);

  // Kad se promijeni currentRestaurant, fetchaj rolu
  useEffect(() => {
    const fetchRole = async () => {
      if (currentRestaurant) {
        try {
          const userRole = await getUserRole(currentRestaurant.id);
          setRole(userRole);
        } catch {
          setRole(null);
        }
      } else {
        setRole(null);
      }
    };
    fetchRole();
  }, [currentRestaurant]);

  // Kad se promijeni currentRestaurant, spremi ga u localStorage
  const setCurrentRestaurant = (restaurant: Restaurant | null) => {
    setCurrentRestaurantState(restaurant);
    if (restaurant) {
      localStorage.setItem("currentRestaurant", JSON.stringify(restaurant));
    } else {
      localStorage.removeItem("currentRestaurant");
    }
  };

  return (
    <AdminContext.Provider
      value={{
        restaurants,
        currentRestaurant,
        setCurrentRestaurant,
        role,
        userName,
        setUserName,
        refreshRestaurants,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context)
    throw new Error("useAdmin must be used within an AdminProvider");
  return context;
};

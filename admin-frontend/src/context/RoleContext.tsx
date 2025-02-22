import React, { createContext, useContext, useState, useEffect } from "react";
import { getUserRole } from "../services/adminService";

interface RoleContextType {
  role: string | null;
  setRole: React.Dispatch<React.SetStateAction<string | null>>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [role, setRole] = useState<string | null>(null);

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
    };

    fetchUserRole();
  }, []);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
};

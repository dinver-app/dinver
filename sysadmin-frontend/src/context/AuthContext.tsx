import React, { createContext, useContext, useState, useEffect } from "react";
import { checkAuth } from "../services/authService";

const AuthContext = createContext({ isAuthenticated: false, isLoading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkIsAuthenticated = async () => {
      try {
        const response = await checkAuth();
        setIsAuthenticated(response.isAuthenticated);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkIsAuthenticated();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

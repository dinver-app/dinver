import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";
import { useEffect } from "react";
import { checkAuth } from "../services/authService";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, setIsAuthenticated, setIsLoading } =
    useAuth();

  useEffect(() => {
    const verifyAuth = async () => {
      setIsLoading(true);
      try {
        const response = await checkAuth();
        setIsAuthenticated(response.isAuthenticated);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [setIsAuthenticated, setIsLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;

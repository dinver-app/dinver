import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";
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
        console.log(response);
        setIsAuthenticated(response.isAuthenticated);
      } catch (error) {
        // setIsAuthenticated(false);
        // window.location.href = "/login";
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [setIsAuthenticated, setIsLoading]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;

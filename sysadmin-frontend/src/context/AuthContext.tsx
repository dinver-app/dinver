import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";
import { checkAuth } from "../services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  recheckAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  setIsAuthenticated: () => {},
  setIsLoading: () => {},
  recheckAuth: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkIsAuthenticated = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await checkAuth();
      setIsAuthenticated(response.isAuthenticated);
    } catch (error) {
      setIsAuthenticated(false);
      window.location.href = "/login";
      window.location.reload();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        setIsAuthenticated,
        setIsLoading,
        recheckAuth: checkIsAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

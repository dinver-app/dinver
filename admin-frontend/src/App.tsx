import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import RestaurantDetails from "./pages/RestaurantDetails/RestaurantDetails";
import Layout from "./components/Layout";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Logs from "./pages/Logs";
import QRGenerator from "./pages/QRGenerator";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";
import Reviews from "./pages/Reviews";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import LoadingScreen from "./components/LoadingScreen";

function App() {
  return (
    <AdminProvider>
      <AuthProvider>
        <Router>
          <Toaster />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ThemeProvider>
                  <Layout>
                    <ProtectedRoute />
                  </Layout>
                </ThemeProvider>
              }
            >
              <Route path="/" element={<Home />} />
              <Route
                path="/restaurants/:slug"
                element={<RestaurantDetails />}
              />
              <Route path="/settings" element={<Settings />} />
              <Route path="/qr-generator" element={<QRGenerator />} />
              <Route
                path="/analytics"
                element={
                  <RoleBasedRoute
                    component={Analytics}
                    allowedRoles={["owner"]}
                  />
                }
              />
              <Route
                path="/logs"
                element={
                  <RoleBasedRoute component={Logs} allowedRoles={["owner"]} />
                }
              />
              <Route
                path="/reviews/:restaurantId"
                element={
                  <RoleBasedRoute
                    component={Reviews}
                    allowedRoles={["owner", "admin"]}
                  />
                }
              />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </AdminProvider>
  );
}

const RoleBasedRoute = ({
  component: Component,
  allowedRoles,
}: {
  component: React.FC;
  allowedRoles: string[];
}) => {
  const { role } = useAdmin();
  if (role === null) {
    return <LoadingScreen />;
  }
  const isAuthorized = allowedRoles.includes(role);
  return isAuthorized ? <Component /> : <Navigate to="/" />;
};

export default App;

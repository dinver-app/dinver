import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Restaurants from "./pages/Restaurants";
import RestaurantDetails from "./pages/RestaurantDetails/RestaurantDetails";
import Users from "./pages/Users";
import Layout from "./components/Layout";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Logs from "./pages/Logs";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";
import Claim from "./pages/Claim";
import Reviews from "./pages/Reviews";
import BlogPage from "./pages/Blog/BlogPage";

function App() {
  return (
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
            <Route path="/restaurants" element={<Restaurants />} />
            <Route path="/restaurants/:slug" element={<RestaurantDetails />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/claim" element={<Claim />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/blog" element={<BlogPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

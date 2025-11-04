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
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";
import Claim from "./pages/Claim";
import Reviews from "./pages/Reviews";
import BlogPage from "./pages/Blog/BlogPage";
import Coupons from "./pages/Coupons";
import Referrals from "./pages/Referrals";
import QRPrintRequests from "./pages/QRPrintRequests";
import Types from "./pages/Types";
import Receipts from "./pages/Receipts";
import ReceiptDetails from "./pages/ReceiptDetails";
import LeaderboardCycles from "./pages/LeaderboardCycles";
import LeaderboardCycleDetails from "./pages/LeaderboardCycleDetails";
import ReviewDetails from "./pages/ReviewDetails";
import Experiences from "./pages/Experiences";
import ExperienceDetails from "./pages/ExperienceDetails";
import UserExperienceStats from "./pages/UserExperienceStats";

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
            <Route path="/claim" element={<Claim />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/qr-print-requests" element={<QRPrintRequests />} />
            <Route path="/types" element={<Types />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/receipts/:id" element={<ReceiptDetails />} />
            <Route path="/reviews/:id" element={<ReviewDetails />} />
            <Route path="/leaderboard-cycles" element={<LeaderboardCycles />} />
            <Route
              path="/leaderboard-cycles/:id"
              element={<LeaderboardCycleDetails />}
            />
            <Route path="/experiences" element={<Experiences />} />
            <Route path="/experiences/:id" element={<ExperienceDetails />} />
            <Route
              path="/experiences/users/:userId/stats"
              element={<UserExperienceStats />}
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

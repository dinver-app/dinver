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
import Visits from "./pages/Visits";
import VisitDetail from "./pages/VisitDetail";
import LeaderboardCycles from "./pages/LeaderboardCycles";
import LeaderboardCycleDetails from "./pages/LeaderboardCycleDetails";
import EditLeaderboardCycle from "./pages/EditLeaderboardCycle";
import ReviewDetails from "./pages/ReviewDetails";
import Experiences from "./pages/Experiences";
import ExperienceDetails from "./pages/ExperienceDetails";
import UserExperienceStats from "./pages/UserExperienceStats";
import OcrAnalytics from "./pages/OcrAnalytics";
import ReceiptAnalytics from "./pages/ReceiptAnalytics";
import SupportTickets from "./pages/SupportTickets";
import SupportTicketDetails from "./pages/SupportTicketDetails";
import GoogleApiLogs from "./pages/GoogleApiLogs";
import { BlogGenerationPage } from "./pages/BlogGeneration";
import BlogTopicPreviewPage from "./pages/BlogGeneration/BlogTopicPreviewPage";

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
            <Route path="/blog-generation" element={<BlogGenerationPage />} />
            <Route path="/blog-generation/topic/:id" element={<BlogTopicPreviewPage />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/qr-print-requests" element={<QRPrintRequests />} />
            <Route path="/types" element={<Types />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/receipts/:id" element={<ReceiptDetails />} />
            <Route path="/visits" element={<Visits />} />
            <Route path="/visits/:id" element={<VisitDetail />} />
            <Route path="/reviews/:id" element={<ReviewDetails />} />
            <Route path="/leaderboard-cycles" element={<LeaderboardCycles />} />
            <Route
              path="/leaderboard-cycles/:id"
              element={<LeaderboardCycleDetails />}
            />
            <Route
              path="/leaderboard-cycles/:id/edit"
              element={<EditLeaderboardCycle />}
            />
            <Route path="/experiences" element={<Experiences />} />
            <Route path="/experiences/:id" element={<ExperienceDetails />} />
            <Route
              path="/experiences/users/:userId/stats"
              element={<UserExperienceStats />}
            />
            <Route path="/ocr-analytics" element={<OcrAnalytics />} />
            <Route path="/receipt-analytics" element={<ReceiptAnalytics />} />
            <Route path="/support-tickets" element={<SupportTickets />} />
            <Route path="/support-tickets/:id" element={<SupportTicketDetails />} />
            <Route path="/google-api-logs" element={<GoogleApiLogs />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

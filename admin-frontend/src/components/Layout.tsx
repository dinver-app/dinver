import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaCog,
  FaRegChartBar,
  FaSignOutAlt,
  FaComments,
} from "react-icons/fa";
import { IoRestaurant } from "react-icons/io5";
import { LuLogs } from "react-icons/lu";
import { QrCodeIcon } from "@heroicons/react/24/outline";
import LogoutModal from "./LogoutModal";
import { useTranslation } from "react-i18next";
import LoadingScreen from "./LoadingScreen";
import { useAdmin } from "../context/AdminContext";
import { logout } from "../services/authService";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const {
    restaurants,
    currentRestaurant,
    setCurrentRestaurant,
    role,
    userName,
  } = useAdmin();

  const confirmLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleRestaurantChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedId = event.target.value;
    const selectedRestaurant = restaurants.find(
      (restaurant) => restaurant.id === selectedId
    );
    if (selectedRestaurant) {
      setCurrentRestaurant({
        id: selectedRestaurant.id,
        name: selectedRestaurant.name,
        slug: selectedRestaurant.slug,
        offer: selectedRestaurant.offer,
        subdomain: selectedRestaurant.subdomain,
      });
      navigate("/");
    }
  };

  const menuItems = [
    {
      name: t("homepage"),
      path: "/",
      icon: <FaHome className="h-4 w-4 mr-3" />,
    },
    {
      name: t("restaurant"),
      path: `/restaurants/${currentRestaurant?.slug}`,
      icon: <IoRestaurant className="h-4 w-4 mr-3" />,
    },
    ...(role === "owner"
      ? [
          {
            name: t("analytics"),
            path: "/analytics",
            icon: <FaRegChartBar className="h-4 w-4 mr-3" />,
          },
          {
            name: t("reviews"),
            path: `/reviews/${currentRestaurant?.id}`,
            icon: <FaComments className="h-4 w-4 mr-3" />,
          },
        ]
      : []),
    {
      name: t("qr_generator"),
      path: "/qr-generator",
      icon: <QrCodeIcon className="h-4 w-4 mr-3" />,
    },
  ];

  const preferenceItems = [
    ...(role === "owner" || role === "admin"
      ? [
          {
            name: t("logs"),
            path: "/logs",
            icon: <LuLogs className="h-4 w-4 mr-3" />,
          },
        ]
      : []),
    {
      name: t("settings"),
      path: "/settings",
      icon: <FaCog className="h-4 w-4 mr-3" />,
    },
  ];

  const handleLogout = () => {
    setModalOpen(true);
  };

  return role === null ? (
    <LoadingScreen />
  ) : (
    <div className="flex">
      <aside className="fixed top-0 left-0 h-screen bg-white shadow-lg z-50 overflow-y-auto transition-all duration-300">
        <div>
          <div className="p-4 border-b select-none">
            <img
              src="/images/admin_logo.svg"
              alt="Logo"
              className="h-16 mb-4"
            />
          </div>
          <div className="p-4 select-none">
            <h2 className="text-sm font-semibold text-gray-500">
              {t("mainMenu")}
            </h2>
          </div>
          <nav className="pb-4">
            <ul>
              {menuItems.map((item) => (
                <li key={item.name} className="mb-2">
                  <button
                    onClick={() => navigate(item.path)}
                    className={`flex items-center p-3 pl-4 w-full text-left text-sm font-light border-l-4 ${
                      location.pathname === item.path
                        ? "bg-green-100 text-green-700 border-green-700"
                        : "border-transparent hover:bg-gray-100"
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-4 border-t select-none">
            <h2 className="text-sm font-semibold text-gray-500">
              {t("preferences")}
            </h2>
          </div>
          <nav className="pb-4">
            <ul>
              {preferenceItems.map((item) => (
                <li key={item.name} className="mb-2">
                  <button
                    onClick={() => navigate(item.path)}
                    className={`flex items-center p-3 pl-4 w-full text-left text-sm font-light border-l-4 ${
                      location.pathname === item.path
                        ? "bg-green-100 text-green-700 border-green-700"
                        : "border-transparent hover:bg-gray-100"
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="p-4 border-t select-none">
          <h2 className="text-sm font-semibold text-gray-500">
            {t("selected_restaurant")}
          </h2>
          <select
            value={currentRestaurant?.id || ""}
            onChange={handleRestaurantChange}
            className="w-full p-2 border rounded text-xs mt-3"
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </div>
        <div className="py-4 border-t flex items-center justify-between px-4">
          <div className="flex justify-between items-center border border-gray-300 rounded-md p-2 flex-grow select-none">
            <div className="flex items-center">
              <div className="flex items-center justify-center bg-gray-200 rounded-full h-8 w-8 mr-2">
                {userName?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-light">{userName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm font-light hover:bg-gray-100 p-2 rounded-md ml-4"
            >
              <FaSignOutAlt className="h-4 w-4" />
            </button>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className={`absolute top-6 right-2 z-50 mb-4 rounded flex items-center justify-center `}
          style={{ width: "32px", height: "32px" }}
        >
          <img
            src={
              isSidebarOpen
                ? "/images/left_arrows.svg"
                : "/images/right_arrows.svg"
            }
            alt={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
            className="h-5 w-5"
          />
        </button>
      </aside>
      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-0"
        } p-6`}
      >
        {!isSidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-0 top-6 bg-gray-200 rounded flex items-center justify-center"
            style={{ width: "24px", height: "24px" }}
          >
            <img
              src="/images/right_arrows.svg"
              alt="Open Sidebar"
              className="h-5 w-5"
            />
          </button>
        )}
        {children}
      </main>
      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
};

export default Layout;

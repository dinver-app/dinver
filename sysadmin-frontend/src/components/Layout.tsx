import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaUser,
  FaCog,
  FaRegChartBar,
  FaSignOutAlt,
} from "react-icons/fa";
import { IoRestaurant } from "react-icons/io5";
import { LuLogs } from "react-icons/lu";
import LogoutModal from "./LogoutModal";
import { useTranslation } from "react-i18next";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setModalOpen] = useState(false);

  const menuItems = [
    {
      name: t("dashboard"),
      path: "/",
      icon: <FaHome className="h-4 w-4 mr-3" />,
    },
    {
      name: t("restaurants"),
      path: "/restaurants",
      icon: <IoRestaurant className="h-4 w-4 mr-3" />,
    },
    {
      name: t("users"),
      path: "/users",
      icon: <FaUser className="h-4 w-4 mr-3" />,
    },
    {
      name: t("analytics"),
      path: "/analytics",
      icon: <FaRegChartBar className="h-4 w-4 mr-3" />,
    },
  ];

  const preferenceItems = [
    {
      name: t("logs"),
      path: "/logs",
      icon: <LuLogs className="h-4 w-4 mr-3" />,
    },
    {
      name: t("settings"),
      path: "/settings",
      icon: <FaCog className="h-4 w-4 mr-3" />,
    },
  ];

  const handleLogout = () => {
    setModalOpen(true);
  };

  const confirmLogout = () => {
    setModalOpen(false);
    navigate("/login");
  };

  return (
    <div className="flex">
      <aside className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 flex flex-col justify-between">
        <div>
          <div className="p-4 border-b select-none">
            <img src="/images/logo__big.svg" alt="Logo" className="h-8 mb-4" />
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
        <div className="py-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center p-3 pl-4 w-full text-left text-sm font-light hover:bg-gray-100"
          >
            <FaSignOutAlt className="h-4 w-4 mr-3" />
            {t("logout")}
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64 p-6">{children}</main>
      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
};

export default Layout;

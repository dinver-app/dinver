import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaBuilding,
  FaUser,
  FaCog,
  FaRegChartBar,
} from "react-icons/fa";
import { IoRestaurant } from "react-icons/io5";
import { LuLogs } from "react-icons/lu";
import { CiLogout } from "react-icons/ci";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", path: "/", icon: <FaHome className="h-4 w-4 mr-3" /> },
    {
      name: "Restaurants",
      path: "/restaurants",
      icon: <IoRestaurant className="h-4 w-4 mr-3" />,
    },
    {
      name: "Organizations",
      path: "/organizations",
      icon: <FaBuilding className="h-4 w-4 mr-3" />,
    },
    {
      name: "Users",
      path: "/users",
      icon: <FaUser className="h-4 w-4 mr-3" />,
    },
    {
      name: "Analytics",
      path: "/analytics",
      icon: <FaRegChartBar className="h-4 w-4 mr-3" />,
    },
  ];

  const preferenceItems = [
    {
      name: "Logs",
      path: "/logs",
      icon: <LuLogs className="h-4 w-4 mr-3" />,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <FaCog className="h-4 w-4 mr-3" />,
    },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white text-gray-800 shadow-lg flex flex-col justify-between">
        <div>
          <div className="p-4 border-b">
            <img
              src="/images/logo__big.svg"
              alt="Logo"
              className="h-10 mb-4 select-none"
            />
          </div>
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-500 cursor-default select-none">
              Main Menu
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
          <div className="p-4 border-t">
            <h2 className="text-sm font-semibold text-gray-500 cursor-default select-none">
              Preferences
            </h2>
          </div>
          <nav className="py-4">
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
            onClick={() => navigate("/login")}
            className="flex items-center p-3 pl-4 w-full text-left text-sm font-light hover:bg-gray-100"
          >
            <CiLogout className="h-4 w-4 mr-3" />
            Log Out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 bg-gray-100">{children}</main>
    </div>
  );
};

export default Layout;

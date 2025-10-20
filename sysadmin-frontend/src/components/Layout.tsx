import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaUser,
  FaCog,
  FaRegChartBar,
  FaSignOutAlt,
  FaShieldAlt,
  FaComments,
  FaTicketAlt,
} from "react-icons/fa";
import { TfiWrite } from "react-icons/tfi";
import { IoRestaurant } from "react-icons/io5";
import LogoutModal from "./LogoutModal";
import { useTranslation } from "react-i18next";
import { logout } from "../services/authService";
import { QrCodeIcon, ReceiptRefundIcon } from "@heroicons/react/24/outline";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  const confirmLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    const userName = localStorage.getItem("sys_user_name");
    if (!userName) {
      confirmLogout();
    }
    setUserName(userName);
  }, []);

  const menuItems = [
    {
      name: t("homepage"),
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
      name: t("blog"),
      path: "/blog",
      icon: <TfiWrite className="h-4 w-4 mr-3" />,
    },
    {
      name: t("analytics"),
      path: "/analytics",
      icon: <FaRegChartBar className="h-4 w-4 mr-3" />,
    },
    {
      name: t("types_management"),
      path: "/types",
      icon: <FaCog className="h-4 w-4 mr-3" />,
    },
    {
      name: t("claim"),
      path: "/claim",
      icon: <FaShieldAlt className="h-4 w-4 mr-3" />,
    },
    {
      name: t("reviews"),
      path: "/reviews",
      icon: <FaComments className="h-4 w-4 mr-3" />,
    },
    {
      name: t("coupons"),
      path: "/coupons",
      icon: <FaTicketAlt className="h-4 w-4 mr-3" />,
    },
    {
      name: "Referrals",
      path: "/referrals",
      icon: <FaUser className="h-4 w-4 mr-3" />,
    },
    {
      name: t("qr_print_requests"),
      path: "/qr-print-requests",
      icon: <QrCodeIcon className="h-4 w-4 mr-3" />,
    },
    {
      name: "Receipts",
      path: "/receipts",
      icon: <ReceiptRefundIcon className="h-4 w-4 mr-3" />,
    },
  ];

  const preferenceItems = [
    {
      name: t("settings"),
      path: "/settings",
      icon: <FaCog className="h-4 w-4 mr-3" />,
    },
  ];

  const handleLogout = () => {
    setModalOpen(true);
  };

  return (
    <div className="flex">
      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-lg z-50 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-0 overflow-hidden"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="p-4 border-b select-none">
            <img
              src="/images/sysadmin_logo.svg"
              alt="Logo"
              className="h-16 mb-4"
            />
            {/* <img src="/images/logo__big.svg" alt="Logo" className="h-8 mb-4" /> */}
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
                      location.pathname.startsWith(item.path) &&
                      item.path !== "/"
                        ? "bg-green-100 text-green-700 border-green-700"
                        : location.pathname === item.path
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
          <div className="py-4 border-t flex items-center justify-between px-4 bg-white">
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

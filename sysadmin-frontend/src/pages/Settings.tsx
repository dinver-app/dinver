import { useEffect, useState, useRef } from "react";
import {
  listSysadmins,
  addSysadmin,
  removeSysadmin,
} from "../services/sysadminService";
import { updateUserLanguage, getUserLanguage } from "../services/userService";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { Sysadmin } from "../interfaces/Interfaces";
import i18n from "i18next";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [sysadmins, setSysadmins] = useState<Sysadmin[]>([]);
  const [newSysadminEmail, setNewSysadminEmail] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedSysadmin, setSelectedSysadmin] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  useEffect(() => {
    fetchSysadmins();
    fetchUserLanguage();
  }, []);

  const fetchSysadmins = async () => {
    try {
      const data = await listSysadmins();
      setSysadmins(data);
    } catch (error: any) {
      toast.error(error.message);
      console.error("Failed to fetch sysadmins", error);
    }
  };

  const fetchUserLanguage = async () => {
    try {
      const { language } = await getUserLanguage();
      setSelectedLanguage(language);
    } catch (error: any) {
      console.error("Failed to fetch user language", error);
    }
  };

  const handleAddSysadmin = async () => {
    try {
      await addSysadmin(newSysadminEmail);
      setNewSysadminEmail("");
      setModalOpen(false);
      fetchSysadmins();
      toast.success("Sysadmin added successfully");
    } catch (error: any) {
      toast.error(error.message);
      console.error("Error object:", error.message);
    }
  };

  const handleRemoveSysadmin = async (userId: string) => {
    try {
      await removeSysadmin(
        sysadmins.find((sysadmin) => sysadmin.id === userId)?.user.email || ""
      );
      fetchSysadmins();
      toast.success("Sysadmin removed successfully");
    } catch (error: any) {
      toast.error(error.message);
      console.error("Failed to remove sysadmin");
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setSelectedSysadmin(null);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLanguageChange = async (language: string) => {
    try {
      await updateUserLanguage(language);
      setSelectedLanguage(language);
      localStorage.setItem("language", language);
      i18n.changeLanguage(language);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">Settings</h1>
        <h3 className="page-subtitle">
          Manage your account settings and preferences.
        </h3>
      </div>
      <div className="h-line mb-4"></div>
      <div className="flex mb-6">
        <button
          onClick={() => handleTabChange("general")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "general"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          General
        </button>
        <button
          onClick={() => handleTabChange("sysadmins")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "sysadmins"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          System Users
        </button>
      </div>

      {activeTab === "general" && (
        <div className="flex flex-col gap-1">
          <h2 className="section-title">General Settings</h2>
          <h3 className="section-subtitle">
            General settings content goes here.
          </h3>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="mt-1 block w-48 p-2 border border-gray-300 rounded outline-gray-300"
            >
              <option value="en">English</option>
              <option value="hr">Hrvatski</option>
            </select>
          </div>
        </div>
      )}

      {activeTab === "sysadmins" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="section-title">Sysadmin Management</h2>
              <h3 className="section-subtitle">List of all system admins.</h3>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="primary-button"
            >
              Add Sysadmin
            </button>
          </div>
          <div className="rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr className="text-sm text-black">
                  <th className="py-2 px-4 text-left font-normal">Email</th>
                  <th className="py-2 px-4 text-left font-normal">
                    First Name
                  </th>
                  <th className="py-2 px-4 text-left font-normal">Last Name</th>
                  <th className="py-2 px-4 text-left font-normal">Added On</th>
                  <th className="py-2 px-4 text-left font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {sysadmins.map((sysadmin) => (
                  <tr
                    key={sysadmin.id}
                    className="hover:bg-gray-100 border-b border-gray-200"
                  >
                    <td className="py-2 px-4 text-sm">{sysadmin.user.email}</td>
                    <td className="py-2 px-4 text-sm text-gray-600">
                      {sysadmin.user.firstName}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-600">
                      {sysadmin.user.lastName}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-600">
                      {format(new Date(sysadmin.createdAt), "dd.MM.yyyy")}
                    </td>
                    <td className="py-2 px-4">
                      <div className="relative" ref={menuRef}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSysadmin(
                              selectedSysadmin === sysadmin.id
                                ? null
                                : sysadmin.id
                            );
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          &#x22EE;
                        </button>
                        {selectedSysadmin === sysadmin.id && (
                          <div className="absolute top-5 right-0 mt-2 w-48 z-50 bg-white border rounded shadow-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSysadmin(sysadmin.id);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/sysadmin_icon.svg"
                alt="Sysadmin Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">Add Sysadmin</h2>
                <p className="text-sm text-gray-500">
                  Add a new sysadmin to manage the system.
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={newSysadminEmail}
                onChange={(e) => setNewSysadminEmail(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="h-line" />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setModalOpen(false)}
                className="secondary-button"
              >
                Cancel
              </button>
              <button onClick={handleAddSysadmin} className="primary-button">
                Add Sysadmin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

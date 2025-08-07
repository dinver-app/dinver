import { useEffect, useState, useRef } from "react";
import {
  listSysadmins,
  addSysadmin,
  removeSysadmin,
} from "../services/sysadminService";
import {
  updateUserLanguage,
  getUserLanguage,
  listAllUsers,
} from "../services/userService";
import {
  listBackups,
  restoreBackup,
  downloadBackup,
} from "../services/backupService";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import {
  Sysadmin,
  Backup,
  Restaurant,
  User,
  AuditLog,
} from "../interfaces/Interfaces";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { getRestaurantsList } from "../services/restaurantService";
import { getAuditLogs } from "../services/auditLogsService";
import {
  analyzeMenuImage,
  analyzeMultipleMenuImages,
  importEditedMenu,
  MenuAnalysisResult,
} from "../services/menuImportService";
import ReactJson from "react-json-view";

const getInitialLanguage = () => {
  return i18n.language || localStorage.getItem("language") || "en";
};

const Settings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("general");
  const [sysadmins, setSysadmins] = useState<Sysadmin[]>([]);
  const [newSysadminEmail, setNewSysadminEmail] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedSysadmin, setSelectedSysadmin] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(
    getInitialLanguage()
  );
  const [backups, setBackups] = useState<Backup[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [logsSearchTerm, setLogsSearchTerm] = useState("");

  // Menu Importer states
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [menuType, setMenuType] = useState<"food" | "drink">("food");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] =
    useState<MenuAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [restaurantSearchTerm, setRestaurantSearchTerm] = useState("");
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(
    []
  );
  const [showRestaurantDropdown, setShowRestaurantDropdown] = useState(false);

  // Editable menu data
  const [editableCategories, setEditableCategories] = useState<
    Array<{
      id: string;
      name: { hr: string; en: string };
      description: { hr: string; en: string };
    }>
  >([]);
  const [editableItems, setEditableItems] = useState<
    Array<{
      id: string;
      name: { hr: string; en: string };
      description: { hr: string; en: string };
      price: number;
      categoryName: string;
      hasSizes: boolean;
      defaultSizeName: string | null;
      sizes: Array<{ name: string; price: number }>;
    }>
  >([]);
  const [showEditMode, setShowEditMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      const loadingToastId = toast.loading(t("loading"));
      try {
        const [sysadmins, userLanguage, backups, restaurants, usersData] =
          await Promise.all([
            listSysadmins(),
            getUserLanguage(),
            listBackups(searchTerm),
            getRestaurantsList(),
            listAllUsers(),
          ]);

        setSysadmins(sysadmins);
        setSelectedLanguage(userLanguage.language);
        setBackups(backups);
        setRestaurants(restaurants);
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error(t("failed_to_fetch_data"));
      } finally {
        toast.dismiss(loadingToastId);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [currentPage, logsSearchTerm, actionFilter, activeTab]);

  // Filter restaurants based on search term
  useEffect(() => {
    if (restaurantSearchTerm.trim() === "") {
      setFilteredRestaurants(restaurants.slice(0, 50)); // Show first 50 by default
    } else {
      const filtered = restaurants
        .filter((restaurant) =>
          restaurant.name
            .toLowerCase()
            .includes(restaurantSearchTerm.toLowerCase())
        )
        .slice(0, 20); // Limit to 20 results for performance
      setFilteredRestaurants(filtered);
    }
  }, [restaurantSearchTerm, restaurants]);

  const fetchLogs = async () => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const logsData = await getAuditLogs(
        currentPage,
        logsSearchTerm,
        actionFilter !== "ALL" ? actionFilter : ""
      );
      setLogs(logsData.logs);
      setTotalPages(logsData.totalPages);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      toast.dismiss(loadingToastId);
    }
  };

  const fetchSysadmins = async () => {
    const loadingToastId = toast.loading(t("loading"));
    try {
      const data = await listSysadmins();
      setSysadmins(data);
    } catch (error: any) {
      toast.error(error.message);
      console.error("Failed to fetch sysadmins", error);
    } finally {
      toast.dismiss(loadingToastId);
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

  // Add click outside handler for restaurant dropdown
  useEffect(() => {
    const handleClickOutsideRestaurant = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".restaurant-dropdown-container")) {
        setShowRestaurantDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideRestaurant);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideRestaurant);
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

  const handleRestoreBackup = async (
    restaurantId: string,
    backupDate: string
  ) => {
    try {
      await restoreBackup(restaurantId, backupDate);
      toast.success(t("backup_restored_successfully"));
    } catch (error: any) {
      toast.error(error.message);
      console.error("Failed to restore backup", error);
    }
  };

  const handleDownloadBackup = async (
    restaurantId: string,
    backupDate: string
  ) => {
    try {
      const blob = await downloadBackup(restaurantId, backupDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${backupDate}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getUserEmail = (userId: string) => {
    const user = users.find((user) => user.id === userId);
    return user ? user.email : t("unknown_user");
  };

  const getRestaurantName = (restaurantId: string) => {
    const restaurant = restaurants.find(
      (restaurant) => restaurant.id === restaurantId
    );
    return restaurant ? restaurant.name : t("unknown_restaurant");
  };

  const handleOpenModal = (log: AuditLog) => {
    setSelectedLog(log);
  };

  const handleCloseModal = () => {
    setSelectedLog(null);
  };

  // Menu Importer functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleRestaurantSelect = (
    restaurantId: string,
    restaurantName: string
  ) => {
    setSelectedRestaurant(restaurantId);
    setRestaurantSearchTerm(restaurantName || "");
    setShowRestaurantDropdown(false);
  };

  const handleRestaurantSearchChange = (value: string) => {
    setRestaurantSearchTerm(value);
    setShowRestaurantDropdown(true);
    if (!value.trim()) {
      setSelectedRestaurant("");
    }
  };

  // Edit functions
  const handleCategoryChange = (
    id: string,
    field: "name" | "description",
    language: "hr" | "en",
    value: string
  ) => {
    setEditableCategories((prev) =>
      prev.map((cat) =>
        cat.id === id
          ? { ...cat, [field]: { ...cat[field], [language]: value } }
          : cat
      )
    );
  };

  const handleItemChange = (
    id: string,
    field:
      | "name"
      | "description"
      | "price"
      | "categoryName"
      | "hasSizes"
      | "defaultSizeName"
      | "sizes",
    language?: "hr" | "en",
    value?: string | number | boolean | Array<{ name: string; price: number }>
  ) => {
    setEditableItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (field === "price") {
            return { ...item, price: value as number };
          } else if (field === "categoryName") {
            return { ...item, categoryName: value as string };
          } else if (field === "hasSizes") {
            return { ...item, hasSizes: value as boolean };
          } else if (field === "defaultSizeName") {
            return { ...item, defaultSizeName: value as string | null };
          } else if (field === "sizes") {
            return {
              ...item,
              sizes: value as Array<{ name: string; price: number }>,
            };
          } else {
            return {
              ...item,
              [field]: { ...item[field], [language!]: value as string },
            };
          }
        }
        return item;
      })
    );
  };

  const handleDeleteCategory = (id: string) => {
    setEditableCategories((prev) => prev.filter((cat) => cat.id !== id));
    // Also remove items from this category
    setEditableItems((prev) =>
      prev.filter((item) => {
        const category = editableCategories.find((cat) => cat.id === id);
        return item.categoryName !== category?.name.hr;
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    setEditableItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddCategory = () => {
    const newId = `cat-${Date.now()}`;
    setEditableCategories((prev) => [
      ...prev,
      {
        id: newId,
        name: { hr: "", en: "" },
        description: { hr: "", en: "" },
      },
    ]);
  };

  const handleAddItem = () => {
    const newId = `item-${Date.now()}`;
    setEditableItems((prev) => [
      ...prev,
      {
        id: newId,
        name: { hr: "", en: "" },
        description: { hr: "", en: "" },
        price: 0,
        categoryName: "",
        hasSizes: false,
        defaultSizeName: null,
        sizes: [],
      },
    ]);
  };

  const handleImportToSystem = async () => {
    if (!selectedRestaurant) {
      toast.error("Please select a restaurant");
      return;
    }

    setIsImporting(true);
    try {
      const result = await importEditedMenu(
        selectedRestaurant,
        menuType,
        editableCategories,
        editableItems
      );

      if (result.success) {
        toast.success(
          `Import successful! Created ${result.results.categories.created} categories and ${result.results.items.created} items.`
        );

        // Reset after successful import
        setShowEditMode(false);
        setEditableCategories([]);
        setEditableItems([]);
        setAnalysisResult(null);
      } else {
        toast.error("Failed to import menu to system");
      }
    } catch (error) {
      console.error("Error importing to system:", error);
      toast.error("Failed to import menu to system");
    } finally {
      setIsImporting(false);
    }
  };

  const handleAnalyzeMenu = async () => {
    if (!selectedRestaurant || selectedFiles.length === 0) {
      toast.error("Please select a restaurant and at least one image");
      return;
    }

    setIsAnalyzing(true);
    try {
      let result: MenuAnalysisResult;

      if (selectedFiles.length === 1) {
        result = await analyzeMenuImage(
          selectedRestaurant,
          selectedFiles[0],
          menuType
        );
      } else {
        result = await analyzeMultipleMenuImages(
          selectedRestaurant,
          selectedFiles,
          menuType
        );
      }

      if (result.success) {
        setAnalysisResult(result);

        // Populate editable data
        if (result.data) {
          setEditableCategories(
            result.data.categories.map((cat, index) => ({
              id: `cat-${index}`,
              name: cat.name,
              description: cat.description || { hr: "", en: "" },
            }))
          );
          setEditableItems(
            result.data.items.map((item, index) => ({
              id: `item-${index}`,
              name: item.name,
              description: item.description || { hr: "", en: "" },
              price: item.price,
              categoryName: item.categoryName,
              hasSizes: item.hasSizes || false,
              defaultSizeName: item.defaultSizeName || null,
              sizes: item.sizes || [],
            }))
          );
          setShowEditMode(true);
        }

        toast.success("Menu analyzed successfully!");
      } else {
        toast.error(result.error || "Failed to analyze menu images");
      }
    } catch (error: any) {
      console.error("Error analyzing menu:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to analyze menu images";
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddSize = (itemId: string) => {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, sizes: [...item.sizes, { name: "", price: 0 }] }
          : item
      )
    );
  };

  const handleRemoveSize = (itemId: string, sizeIndex: number) => {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              sizes: item.sizes.filter((_, index) => index !== sizeIndex),
            }
          : item
      )
    );
  };

  const handleSizeChange = (
    itemId: string,
    sizeIndex: number,
    field: "name" | "price",
    value: string | number
  ) => {
    setEditableItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newSizes = [...item.sizes];
          newSizes[sizeIndex] = { ...newSizes[sizeIndex], [field]: value };
          return { ...item, sizes: newSizes };
        }
        return item;
      })
    );
  };

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">{t("settings")}</h1>
        <h3 className="page-subtitle">{t("manage_your_account_settings")}</h3>
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
          {t("general_settings")}
        </button>
        <button
          onClick={() => handleTabChange("sysadmins")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "sysadmins"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          {t("system_users")}
        </button>
        <button
          onClick={() => handleTabChange("backups")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "backups"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          {t("backups")}
        </button>
        <button
          onClick={() => handleTabChange("logs")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "logs" ? "border-b-2 border-black" : "text-gray-500"
          }`}
        >
          {t("logs")}
        </button>
        <button
          onClick={() => handleTabChange("menuImporter")}
          className={`py-2 px-4 border-b-2 text-sm ${
            activeTab === "menuImporter"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          Menu Importer
        </button>
      </div>

      {activeTab === "general" && (
        <div className="flex flex-col gap-1">
          <h2 className="section-title">{t("general_settings")}</h2>
          <h3 className="section-subtitle">
            {t("general_settings_content_goes_here")}
          </h3>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              {t("language")}
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
              <h2 className="section-title">{t("sysadmin_management")}</h2>
              <h3 className="section-subtitle">
                {t("list_of_all_system_admins")}
              </h3>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="primary-button"
            >
              {t("add_sysadmin")}
            </button>
          </div>
          <div className="rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr className="text-sm text-black">
                  <th className="py-2 px-4 text-left font-normal">
                    {t("email")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("first_name")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("last_name")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("added_on")}
                  </th>
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
                      {format(new Date(sysadmin.createdAt), "dd.MM.yyyy.")}
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
                              {t("remove")}
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

      {activeTab === "backups" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="section-title">{t("backups")}</h2>
              <h3 className="section-subtitle">{t("list_of_all_backups")}</h3>
            </div>
            <input
              type="text"
              placeholder={t("search_backups")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
            />
          </div>
          <div className="rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr className="text-sm text-black">
                  <th className="py-2 px-4 text-left font-normal">
                    {t("restaurant_name")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal">
                    {t("backup_date")}
                  </th>
                  <th className="py-2 px-4 text-left font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {backups
                  .filter((backup) => {
                    const restaurant = restaurants.find(
                      (r) => r.id === backup.restaurantId
                    );
                    return restaurant
                      ? restaurant.name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                      : false;
                  })
                  .map((backup) => {
                    const restaurant = restaurants.find(
                      (r) => r.id === backup.restaurantId
                    );
                    return (
                      <tr
                        key={backup.key}
                        className="hover:bg-gray-100 border-b border-gray-200"
                      >
                        <td className="py-2 px-4 text-sm">
                          {restaurant
                            ? restaurant.name
                            : t("unknown_restaurant")}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600">
                          {format(
                            new Date(backup.backupDate),
                            "dd.MM.yyyy. HH:mm"
                          )}
                        </td>
                        <td className="py-2 px-4 text-right">
                          <button
                            onClick={() =>
                              handleRestoreBackup(
                                backup.restaurantId,
                                backup.backupDate
                              )
                            }
                            className="text-black border border-gray-400 rounded px-2 py-1 text-xs mr-2 transition-colors duration-200 hover:bg-gray-200"
                          >
                            {t("restore")}
                          </button>
                          <button
                            onClick={() =>
                              handleDownloadBackup(
                                backup.restaurantId,
                                backup.backupDate
                              )
                            }
                            className="text-black border border-gray-400 rounded px-2 py-1 text-xs transition-colors duration-200 hover:bg-gray-200"
                          >
                            {t("download")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              placeholder={t("search_logs")}
              value={logsSearchTerm}
              onChange={(e) => setLogsSearchTerm(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
            >
              <option value="all">{t("all_actions")}</option>
              <option value="created">{t("created")}</option>
              <option value="updated">{t("updated")}</option>
              <option value="deleted">{t("deleted")}</option>
            </select>
          </div>
          {logs.length === 0 ? (
            <div className="text-center text-gray-500">
              {t("no_logs_available")}
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-100">
                    <tr className="text-sm text-black">
                      <th className="py-2 px-4 text-left font-normal w-64">
                        {t("user")}
                      </th>
                      <th className="py-2 px-4 text-left font-normal w-40">
                        {t("action")}
                      </th>
                      <th className="py-2 px-4 text-left font-normal w-40">
                        {t("entity")}
                      </th>
                      <th className="py-2 px-4 text-left font-normal w-64">
                        {t("restaurant")}
                      </th>
                      <th className="py-2 px-4 text-left font-normal w-48">
                        {t("date")}
                      </th>
                      <th className="py-2 px-4 text-left font-normal w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-gray-100 border-b border-gray-200"
                      >
                        <td className="py-2 px-4 text-sm w-64">
                          {getUserEmail(log.userId)}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 w-40">
                          {t(log.action)}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 w-40">
                          {t(log.entity)}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 w-64">
                          {getRestaurantName(log.restaurantId)}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 w-48">
                          {format(new Date(log.createdAt), "dd.MM.yyyy. HH:mm")}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-600 w-10">
                          <button
                            onClick={() => handleOpenModal(log)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            ...
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm">
                  {t("page")} {currentPage} {t("of")} {totalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "menuImporter" && (
        <div>
          <div className="flex flex-col gap-1 mb-6">
            <h2 className="section-title">Menu Importer</h2>
            <h3 className="section-subtitle">
              Upload menu images to analyze with AI, then edit and import to
              system
            </h3>
          </div>

          <div className="space-y-6">
            {/* Restaurant Selection */}
            <div className="restaurant-dropdown-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Restaurant
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  value={restaurantSearchTerm}
                  onChange={(e) => handleRestaurantSearchChange(e.target.value)}
                  onFocus={() => setShowRestaurantDropdown(true)}
                  className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                />
                {showRestaurantDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredRestaurants.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">
                        No restaurants found
                      </div>
                    ) : (
                      filteredRestaurants.map((restaurant) => (
                        <button
                          key={restaurant.id}
                          onClick={() =>
                            handleRestaurantSelect(
                              restaurant.id || "",
                              restaurant.name || ""
                            )
                          }
                          className="w-full text-left p-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
                        >
                          {restaurant.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedRestaurant && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Selected:{" "}
                    {restaurants.find((r) => r.id === selectedRestaurant)
                      ?.name || "Unknown"}
                  </p>
                </div>
              )}
            </div>

            {/* Menu Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Menu Type
              </label>
              <select
                value={menuType}
                onChange={(e) =>
                  setMenuType(e.target.value as "food" | "drink")
                }
                className="w-full p-2 border border-gray-300 rounded outline-gray-300"
              >
                <option value="food">Food Menu</option>
                <option value="drink">Drink Menu</option>
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Menu Images
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
              {selectedFiles.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Selected files:{" "}
                    {selectedFiles.map((f) => f.name).join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Analyze Button */}
            <div>
              <button
                onClick={handleAnalyzeMenu}
                disabled={
                  !selectedRestaurant ||
                  selectedFiles.length === 0 ||
                  isAnalyzing
                }
                className="primary-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Menu Images"}
              </button>
            </div>

            {/* Results */}
            {showEditMode && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Edit Menu Data</h3>
                  <button
                    onClick={handleImportToSystem}
                    disabled={isImporting}
                    className="primary-button disabled:opacity-50"
                  >
                    {isImporting ? "Importing..." : "Import to System"}
                  </button>
                </div>

                {/* Categories Table */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-semibold">Categories</h4>
                    <button
                      onClick={handleAddCategory}
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      + Add Category
                    </button>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Name (HR)
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Name (EN)
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Description (HR)
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Description (EN)
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {editableCategories.map((category) => (
                          <tr
                            key={category.id}
                            className="border-t border-gray-200 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={category.name.hr}
                                onChange={(e) =>
                                  handleCategoryChange(
                                    category.id,
                                    "name",
                                    "hr",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 text-sm border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={category.name.en}
                                onChange={(e) =>
                                  handleCategoryChange(
                                    category.id,
                                    "name",
                                    "en",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 text-sm border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={category.description.hr}
                                onChange={(e) =>
                                  handleCategoryChange(
                                    category.id,
                                    "description",
                                    "hr",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 text-sm border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={category.description.en}
                                onChange={(e) =>
                                  handleCategoryChange(
                                    category.id,
                                    "description",
                                    "en",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 text-sm border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() =>
                                  handleDeleteCategory(category.id)
                                }
                                className="text-red-500 hover:text-red-700 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-semibold">Items</h4>
                    <button
                      onClick={handleAddItem}
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      + Add Item
                    </button>
                  </div>
                  <div className="space-y-4">
                    {editableItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Basic Info */}
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Name (HR)
                            </label>
                            <input
                              type="text"
                              value={item.name.hr}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "name",
                                  "hr",
                                  e.target.value
                                )
                              }
                              className="w-full p-2 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Name (EN)
                            </label>
                            <input
                              type="text"
                              value={item.name.en}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "name",
                                  "en",
                                  e.target.value
                                )
                              }
                              className="w-full p-2 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "price",
                                  undefined,
                                  parseFloat(e.target.value)
                                )
                              }
                              className="w-full p-2 text-sm border border-gray-300 rounded"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Category
                            </label>
                            <select
                              value={item.categoryName}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "categoryName",
                                  undefined,
                                  e.target.value
                                )
                              }
                              className="w-full p-2 text-sm border border-gray-300 rounded"
                            >
                              <option value="">Select Category</option>
                              {editableCategories.map((cat) => (
                                <option key={cat.id} value={cat.name.hr}>
                                  {cat.name.hr}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Has Sizes
                            </label>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={item.hasSizes}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    "hasSizes",
                                    undefined,
                                    e.target.checked
                                  )
                                }
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-600">
                                Enable multiple sizes
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Default Size Name
                            </label>
                            <input
                              type="text"
                              value={item.defaultSizeName || ""}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "defaultSizeName",
                                  undefined,
                                  e.target.value
                                )
                              }
                              className="w-full p-2 text-sm border border-gray-300 rounded"
                              placeholder="e.g., Mala, Standardna"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Description (HR)
                            </label>
                            <textarea
                              value={item.description.hr}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "description",
                                  "hr",
                                  e.target.value
                                )
                              }
                              className="w-full p-2 text-sm border border-gray-300 rounded"
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Description (EN)
                            </label>
                            <textarea
                              value={item.description.en}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "description",
                                  "en",
                                  e.target.value
                                )
                              }
                              className="w-full p-2 text-sm border border-gray-300 rounded"
                              rows={2}
                            />
                          </div>
                        </div>

                        {/* Sizes Section */}
                        {item.hasSizes && (
                          <div className="mt-6">
                            <div className="flex justify-between items-center mb-3">
                              <label className="block text-sm font-medium text-gray-700">
                                Sizes
                              </label>
                              <button
                                onClick={() => handleAddSize(item.id)}
                                className="text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                              >
                                + Add Size
                              </button>
                            </div>
                            <div className="space-y-2">
                              {item.sizes.map((size, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                                >
                                  <input
                                    type="text"
                                    value={size.name}
                                    onChange={(e) =>
                                      handleSizeChange(
                                        item.id,
                                        index,
                                        "name",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Size name"
                                    className="flex-1 p-2 text-sm border border-gray-300 rounded"
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={size.price}
                                    onChange={(e) =>
                                      handleSizeChange(
                                        item.id,
                                        index,
                                        "price",
                                        parseFloat(e.target.value)
                                      )
                                    }
                                    placeholder="Price"
                                    className="w-28 p-2 text-sm border border-gray-300 rounded"
                                  />
                                  <button
                                    onClick={() =>
                                      handleRemoveSize(item.id, index)
                                    }
                                    className="text-red-500 hover:text-red-700 text-sm px-3 py-2 border border-red-300 rounded hover:bg-red-50"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-6 flex justify-end pt-4 border-t border-gray-200">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-500 hover:text-red-700 text-sm px-4 py-2 border border-red-300 rounded hover:bg-red-50 transition-colors"
                          >
                            Delete Item
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Original JSON Results (hidden when in edit mode) */}
            {analysisResult && !showEditMode && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ReactJson
                    src={analysisResult}
                    name={false}
                    collapsed={false}
                    displayDataTypes={false}
                    displayObjectSize={false}
                    enableClipboard={true}
                    style={{ backgroundColor: "transparent" }}
                  />
                </div>
              </div>
            )}
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
                <h2 className="text-lg font-semibold">{t("add_sysadmin")}</h2>
                <p className="text-sm text-gray-500">
                  {t("add_sysadmin_description")}
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
                {t("cancel")}
              </button>
              <button onClick={handleAddSysadmin} className="primary-button">
                {t("add_sysadmin")}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative overflow-y-auto max-h-full">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/log_details.svg"
                alt="Log Details Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("log_details")}</h2>
                <p className="text-sm text-gray-500">{t("view_log_details")}</p>
              </div>
            </div>
            <div className="h-line mb-4"></div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("userId")}</h3>
              <p className="text-xs text-gray-600">{selectedLog.userId}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("userEmail")}</h3>
              <p className="text-xs text-gray-600">
                {getUserEmail(selectedLog.userId)}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("action")}</h3>
              <p className="text-xs text-gray-600">{t(selectedLog.action)}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("entity")}</h3>
              <p className="text-xs text-gray-600">{t(selectedLog.entity)}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("restaurantId")}</h3>
              <p className="text-xs text-gray-600">
                {selectedLog.restaurantId}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("restaurantName")}</h3>
              <p className="text-xs text-gray-600">
                {getRestaurantName(selectedLog.restaurantId)}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("date")}</h3>
              <p className="text-xs text-gray-600">
                {format(new Date(selectedLog.createdAt), "dd.MM.yyyy. HH:mm")}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold">{t("changes")}</h3>
              <ReactJson
                src={JSON.parse(selectedLog.changes)}
                name={false}
                collapsed={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

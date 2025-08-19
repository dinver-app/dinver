import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import {
  type Coupon,
  type CreateCouponData,
  type UpdateCouponData,
  type Restaurant,
  type CouponStats,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getSystemCoupons,
  getCouponStats,
} from "../services/couponService";
import { getRestaurantsList } from "../services/restaurantService";
import { getMenuItems, getCategoryItems } from "../services/menuService";
import { getDrinkItems } from "../services/drinkService";
import { getDrinkCategories } from "../services/drinkService";

const Coupons = () => {
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponStats, setCouponStats] = useState<CouponStats | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [rewardOptions, setRewardOptions] = useState<any[]>([]);
  const [rewardItemsSearchTerm, setRewardItemsSearchTerm] = useState("");
  const [filteredRewardOptions, setFilteredRewardOptions] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(
    []
  );
  const [restaurantSearchTerm, setRestaurantSearchTerm] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [couponFormData, setCouponFormData] = useState<CreateCouponData>({
    source: "DINVER",
    restaurantId: "",
    title: "",
    description: "",
    type: "REWARD_ITEM",
    rewardItemId: "",
    percentOff: undefined,
    fixedOff: undefined,
    totalLimit: undefined,
    startsAt: undefined,
    expiresAt: undefined,
    status: "DRAFT",
    conditionKind: "POINTS_AT_LEAST",
    conditionValue: 100,
    conditionRestaurantScopeId: undefined,
  });

  useEffect(() => {
    fetchCoupons();
    fetchCouponStats();
    fetchRestaurants();
  }, []);

  const fetchCoupons = async () => {
    try {
      const couponsData = await getSystemCoupons();
      setCoupons(couponsData);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error(t("coupons.error.fetching"));
    }
  };

  const fetchCouponStats = async () => {
    try {
      const stats = await getCouponStats();
      setCouponStats(stats);
    } catch (error) {
      console.error("Error fetching coupon stats:", error);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const list = await getRestaurantsList(); // Use 0 as parameter for all restaurants
      // Expecting list as array of { id, name }
      setRestaurants(list || []);
      setFilteredRestaurants(list || []);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    }
  };

  const fetchRewardOptions = async (restaurantId: string) => {
    try {
      const [menuItems, drinkItems, categories, drinkCategories] =
        await Promise.all([
          getMenuItems(restaurantId),
          getDrinkItems(restaurantId),
          getCategoryItems(restaurantId),
          getDrinkCategories(restaurantId),
        ]);

      const allItems = [
        ...(menuItems || []).map((item: any) => ({
          ...item,
          categoryName:
            categories?.find((cat: any) => cat.id === item.categoryId)
              ?.translations?.[0]?.name || "Unknown",
          type: "menu",
        })),
        ...(drinkItems || []).map((item: any) => ({
          ...item,
          categoryName:
            drinkCategories?.find((cat: any) => cat.id === item.categoryId)
              ?.translations?.[0]?.name || "Unknown",
          type: "drink",
        })),
      ];

      setRewardOptions(allItems);
      setFilteredRewardOptions(allItems);
    } catch (error) {
      console.error("Error fetching reward options:", error);
    }
  };

  const fetchRewardOptionsForEdit = async (restaurantId: string) => {
    try {
      const [menuItems, drinkItems, categories, drinkCategories] =
        await Promise.all([
          getMenuItems(restaurantId),
          getDrinkItems(restaurantId),
          getCategoryItems(restaurantId),
          getDrinkCategories(restaurantId),
        ]);

      const allItems = [
        ...(menuItems || []).map((item: any) => ({
          ...item,
          categoryName:
            categories?.find((cat: any) => cat.id === item.categoryId)
              ?.translations?.[0]?.name || "Unknown",
          type: "menu",
        })),
        ...(drinkItems || []).map((item: any) => ({
          ...item,
          categoryName:
            drinkCategories?.find((cat: any) => cat.id === item.categoryId)
              ?.translations?.[0]?.name || "Unknown",
          type: "drink",
        })),
      ];

      setRewardOptions(allItems);
      setFilteredRewardOptions(allItems);
    } catch (error) {
      console.error("Error fetching reward options:", error);
    }
  };

  const updateCondition = (
    field: "conditionKind" | "conditionValue" | "conditionRestaurantScopeId",
    value: any
  ) => {
    setCouponFormData({
      ...couponFormData,
      [field]: value,
    });
  };

  const canGoToNextStep = () => {
    switch (currentStep) {
      case 1:
        return couponFormData.title.trim() !== "";
      case 2:
        return couponFormData.restaurantId !== "";
      case 3:
        return couponFormData.type !== undefined;
      case 4:
        if (couponFormData.type === "REWARD_ITEM") {
          return couponFormData.rewardItemId !== "";
        }
        return true;
      default:
        return true;
    }
  };

  const resetCouponForm = () => {
    setCouponFormData({
      source: "DINVER",
      restaurantId: "",
      title: "",
      description: "",
      type: "REWARD_ITEM",
      rewardItemId: "",
      percentOff: undefined,
      fixedOff: undefined,
      totalLimit: undefined,
      startsAt: undefined,
      expiresAt: undefined,
      status: "DRAFT",
      conditionKind: "POINTS_AT_LEAST",
      conditionValue: 100,
      conditionRestaurantScopeId: undefined,
    });
    setEditingCoupon(null);
    setCurrentStep(1);
    setRewardOptions([]);
    setFilteredRewardOptions([]);
    setRewardItemsSearchTerm("");
    setSelectedImage(null);
    setImagePreview(null);
    setFilteredRestaurants(restaurants);
    setRestaurantSearchTerm("");
    setSourceFilter("ALL");
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setCouponFormData({
      source: coupon.source,
      restaurantId: coupon.restaurantId,
      title: coupon.title,
      description: coupon.description || "",
      type: coupon.type,
      rewardItemId: coupon.rewardItemId || "",
      percentOff: coupon.percentOff || undefined,
      fixedOff: coupon.fixedOff || undefined,
      totalLimit: coupon.totalLimit || undefined,
      startsAt: coupon.startsAt
        ? new Date(coupon.startsAt).toISOString().slice(0, 16)
        : undefined,
      expiresAt: coupon.expiresAt
        ? new Date(coupon.expiresAt).toISOString().slice(0, 16)
        : undefined,
      status: coupon.status,
      conditionKind: coupon.conditionKind || "POINTS_AT_LEAST",
      conditionValue: coupon.conditionValue || 100,
      conditionRestaurantScopeId: coupon.conditionRestaurantScopeId,
    });

    setEditingCoupon(coupon);
    setShowAddModal(true);
    setCurrentStep(1);
    setSourceFilter("ALL");

    // Load reward options for editing
    if (coupon.restaurantId && coupon.type === "REWARD_ITEM") {
      fetchRewardOptionsForEdit(coupon.restaurantId);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (window.confirm(t("coupons.confirm.delete"))) {
      try {
        await deleteCoupon(id);
        toast.success(t("coupons.success.deleted"));
        fetchCoupons();
        fetchCouponStats();
        setSourceFilter("ALL");
      } catch (error) {
        console.error("Failed to delete coupon:", error);
        toast.error(t("coupons.error.deleting"));
      }
    }
  };

  const handleCreateCoupon = async () => {
    try {
      const createData: CreateCouponData = {
        source: couponFormData.source,
        restaurantId: couponFormData.restaurantId,
        title: couponFormData.title,
        description: couponFormData.description,
        type: couponFormData.type,
        rewardItemId: couponFormData.rewardItemId || undefined,
        percentOff: couponFormData.percentOff,
        fixedOff: couponFormData.fixedOff,
        totalLimit: couponFormData.totalLimit,
        startsAt:
          couponFormData.startsAt && couponFormData.startsAt.trim() !== ""
            ? couponFormData.startsAt
            : null,
        expiresAt:
          couponFormData.expiresAt && couponFormData.expiresAt.trim() !== ""
            ? couponFormData.expiresAt
            : null,
        status: couponFormData.status,
        imageFile: selectedImage || undefined,
        conditionKind: couponFormData.conditionKind,
        conditionValue: couponFormData.conditionValue,
        conditionRestaurantScopeId: couponFormData.conditionRestaurantScopeId,
      };

      await createCoupon(createData);
      toast.success(t("coupons.success.created"));
      setShowAddModal(false);
      fetchCoupons();
      fetchCouponStats();
      setSourceFilter("ALL");
      resetCouponForm();
    } catch (error) {
      console.error("Failed to create coupon:", error);
      toast.error(t("coupons_error_creating"));
    }
  };

  const handleUpdateCoupon = async () => {
    if (!editingCoupon) return;

    try {
      const updateData: UpdateCouponData = {
        source: couponFormData.source,
        restaurantId: couponFormData.restaurantId,
        title: couponFormData.title,
        description: couponFormData.description,
        type: couponFormData.type,
        rewardItemId: couponFormData.rewardItemId || undefined,
        percentOff: couponFormData.percentOff,
        fixedOff: couponFormData.fixedOff,
        totalLimit: couponFormData.totalLimit,
        startsAt:
          couponFormData.startsAt && couponFormData.startsAt.trim() !== ""
            ? couponFormData.startsAt
            : null,
        expiresAt:
          couponFormData.expiresAt && couponFormData.expiresAt.trim() !== ""
            ? couponFormData.expiresAt
            : null,
        status: couponFormData.status,
        imageFile: selectedImage || undefined,
        conditionKind: couponFormData.conditionKind,
        conditionValue: couponFormData.conditionValue,
        conditionRestaurantScopeId: couponFormData.conditionRestaurantScopeId,
      };

      await updateCoupon(editingCoupon.id, updateData);
      toast.success(t("coupons_success_updated"));
      setShowAddModal(false);
      fetchCoupons();
      fetchCouponStats();
      setSourceFilter("ALL");
      resetCouponForm();
    } catch (error) {
      console.error("Failed to update coupon:", error);
      toast.error(t("coupons.error.updating"));
    }
  };

  // Load reward options when restaurant changes
  useEffect(() => {
    if (couponFormData.restaurantId && couponFormData.type === "REWARD_ITEM") {
      fetchRewardOptions(couponFormData.restaurantId);
    }
  }, [couponFormData.restaurantId, couponFormData.type]);

  // Load reward options when editing a coupon
  useEffect(() => {
    if (
      editingCoupon &&
      editingCoupon.restaurantId &&
      editingCoupon.type === "REWARD_ITEM"
    ) {
      fetchRewardOptionsForEdit(editingCoupon.restaurantId);
    }
  }, [editingCoupon]); // Remove rewardOptions from dependencies

  // Set reward item search term when rewardOptions change (separate useEffect)
  useEffect(() => {
    if (
      editingCoupon &&
      editingCoupon.rewardItemId &&
      rewardOptions.length > 0
    ) {
      const selectedItem = rewardOptions.find(
        (item) => item.id === editingCoupon.rewardItemId
      );
      if (selectedItem) {
        setRewardItemsSearchTerm(
          `[${selectedItem.categoryName}] ${selectedItem.name}`
        );
        // Don't show dropdown automatically when editing
        setFilteredRewardOptions([]);
      }
    }
  }, [editingCoupon?.rewardItemId, rewardOptions]);

  // Sync restaurant search term with selected restaurant
  useEffect(() => {
    if (couponFormData.restaurantId) {
      const selectedRestaurant = restaurants.find(
        (r) => r.id === couponFormData.restaurantId
      );
      if (
        selectedRestaurant &&
        restaurantSearchTerm !== selectedRestaurant.name
      ) {
        setRestaurantSearchTerm(selectedRestaurant.name);
      }
    }
  }, [couponFormData.restaurantId, restaurants, restaurantSearchTerm]);

  // Filter coupons based on source filter
  const filteredCoupons = coupons.filter((coupon) => {
    if (sourceFilter === "ALL") return true;
    return coupon.source === sourceFilter;
  });

  // Calculate filtered stats
  const filteredStats = {
    totalCoupons: filteredCoupons.length,
    activeCoupons: filteredCoupons.filter((c) => c.status === "ACTIVE").length,
    totalClaims: filteredCoupons.reduce(
      (sum, c) => sum + (c.claimedCount || 0),
      0
    ),
    totalRedemptions: 0, // This would need to come from backend for filtered coupons
  };

  // Click outside handler to close restaurant dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".restaurant-dropdown")) {
        setFilteredRestaurants([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">{t("coupons")}</h1>
        <h3 className="page-subtitle">{t("coupon_management_description")}</h3>
      </div>
      <div className="h-line mb-4"></div>

      {/* Header with Create Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {t("coupon_management")}
          </h2>
          <p className="text-gray-600 mt-1">
            {t("coupon_management_description")}
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            resetCouponForm();
            setSourceFilter("ALL");
          }}
          className="primary-button px-6 py-3"
        >
          {t("create_coupon")}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t("total_coupons")}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {sourceFilter === "ALL"
                  ? couponStats?.totalCoupons || 0
                  : filteredStats.totalCoupons}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t("active_coupons")}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {sourceFilter === "ALL"
                  ? couponStats?.activeCoupons || 0
                  : filteredStats.activeCoupons}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t("total_claims")}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {sourceFilter === "ALL"
                  ? couponStats?.totalClaims || 0
                  : filteredStats.totalClaims}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t("total_redemptions")}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {couponStats?.totalRedemptions || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* ) */}

      {/* Coupons Table */}
      <div className="bg-white rounded-lg shadow-md border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              {t("coupons")}
            </h3>
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                Filter by source:
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="ALL">{t("all_sources")}</option>
                <option value="DINVER">{t("system_coupons")}</option>
                <option value="RESTAURANT">{t("restaurant_coupons")}</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("coupon_title")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("source")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("coupon_type")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("coupon_status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("claims")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("expires")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        {t("no_coupons_found")}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {t("create_your_first_coupon")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {coupon.title}
                        </div>
                        {coupon.description && (
                          <div className="text-sm text-gray-500">
                            {coupon.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          coupon.source === "DINVER"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {coupon.source === "DINVER" ? "System" : "Restaurant"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {t(coupon.type.toLowerCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={coupon.status}
                        onChange={async (e) => {
                          try {
                            const newStatus = e.target.value as
                              | "DRAFT"
                              | "ACTIVE"
                              | "PAUSED"
                              | "EXPIRED";
                            await updateCoupon(coupon.id, {
                              source: coupon.source,
                              restaurantId: coupon.restaurantId,
                              title: coupon.title,
                              description: coupon.description,
                              type: coupon.type,
                              rewardItemId: coupon.rewardItemId,
                              percentOff: coupon.percentOff,
                              fixedOff: coupon.fixedOff,
                              totalLimit: coupon.totalLimit,
                              startsAt:
                                coupon.startsAt && coupon.startsAt.trim() !== ""
                                  ? coupon.startsAt
                                  : undefined,
                              expiresAt:
                                coupon.expiresAt &&
                                coupon.expiresAt.trim() !== ""
                                  ? coupon.expiresAt
                                  : undefined,
                              status: newStatus,
                              conditionKind: coupon.conditionKind,
                              conditionValue: coupon.conditionValue,
                              conditionRestaurantScopeId:
                                coupon.conditionRestaurantScopeId,
                            });
                            toast.success(t("coupon_status_updated"));
                            fetchCoupons();
                            fetchCouponStats();
                            setSourceFilter("ALL");
                          } catch (error) {
                            console.error(
                              "Failed to update coupon status:",
                              error
                            );
                            toast.error(t("failed_to_update_coupon_status"));
                          }
                        }}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer ${
                          coupon.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : coupon.status === "DRAFT"
                            ? "bg-gray-100 text-gray-800"
                            : coupon.status === "PAUSED"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        <option value="DRAFT">{t("draft")}</option>
                        <option value="ACTIVE">{t("active")}</option>
                        <option value="PAUSED">{t("paused")}</option>
                        <option value="EXPIRED">{t("expired")}</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coupon.claimedCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coupon.expiresAt
                        ? new Date(coupon.expiresAt).toLocaleDateString(
                            "hr-HR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )
                        : t("no_expiration")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditCoupon(coupon)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coupon Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingCoupon ? t("edit_coupon") : t("create_coupon")}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetCouponForm();
                  setSourceFilter("ALL");
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Step Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step <= currentStep
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {step}
                    </div>
                    {step < 5 && (
                      <div
                        className={`w-16 h-1 mx-2 ${
                          step < currentStep ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-600">
                <span>{t("coupon_title")}</span>
                <span>{t("restaurant")}</span>
                <span>{t("coupon_type")}</span>
                <span>{t("coupon_details")}</span>
                <span>{t("conditions")}</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (currentStep < 5) {
                  nextStep();
                } else {
                  editingCoupon ? handleUpdateCoupon() : handleCreateCoupon();
                }
              }}
            >
              {/* Step 1: Title and Description */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    {t("step_1_title")}
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mt-4">
                      {t("coupon_title")} *
                    </label>
                    <input
                      type="text"
                      value={couponFormData.title}
                      onChange={(e) =>
                        setCouponFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                      placeholder={t("enter_coupon_title")}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mt-4">
                      {t("coupon_description")}
                    </label>
                    <textarea
                      value={couponFormData.description || ""}
                      onChange={(e) =>
                        setCouponFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                      rows={3}
                      placeholder={t("enter_coupon_description")}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Restaurant Selection */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    {t("step_2_title")}
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("restaurant")} *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={restaurantSearchTerm}
                        placeholder={t("search_restaurants_placeholder")}
                        onChange={(e) => {
                          const searchTerm = e.target.value;
                          setRestaurantSearchTerm(searchTerm);

                          // Clear restaurantId if search term doesn't match selected restaurant
                          if (couponFormData.restaurantId) {
                            const selectedRestaurant = restaurants.find(
                              (r) => r.id === couponFormData.restaurantId
                            );
                            if (
                              selectedRestaurant &&
                              !searchTerm
                                .toLowerCase()
                                .includes(selectedRestaurant.name.toLowerCase())
                            ) {
                              setCouponFormData((prev) => ({
                                ...prev,
                                restaurantId: "",
                              }));
                            }
                          }

                          const filtered = restaurants.filter((r) =>
                            r.name
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase())
                          );
                          setFilteredRestaurants(filtered);
                        }}
                        onFocus={() => {
                          if (restaurantSearchTerm) {
                            const filtered = restaurants.filter((r) =>
                              r.name
                                .toLowerCase()
                                .includes(restaurantSearchTerm.toLowerCase())
                            );
                            setFilteredRestaurants(filtered);
                          }
                        }}
                        className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                        required
                      />
                      {restaurantSearchTerm &&
                        filteredRestaurants.length > 0 && (
                          <div className="restaurant-dropdown absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {filteredRestaurants.map((r) => (
                              <div
                                key={r.id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => {
                                  setCouponFormData((prev) => ({
                                    ...prev,
                                    restaurantId: r.id,
                                  }));
                                  setRestaurantSearchTerm(r.name);
                                  setFilteredRestaurants([]);
                                }}
                              >
                                {r.name}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {t("restaurant_selection_info")}
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Coupon Type Selection */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    {t("step_3_title")}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Reward Item Card */}
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        couponFormData.type === "REWARD_ITEM"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() =>
                        setCouponFormData((prev) => ({
                          ...prev,
                          type: "REWARD_ITEM",
                        }))
                      }
                    >
                      <h5 className="font-semibold text-gray-800 mb-2">
                        {t("reward_item")}
                      </h5>
                      <p className="text-sm text-gray-600">
                        {t("reward_item_description")}
                      </p>
                    </div>

                    {/* Percent Discount Card */}
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        couponFormData.type === "PERCENT_DISCOUNT"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() =>
                        setCouponFormData((prev) => ({
                          ...prev,
                          type: "PERCENT_DISCOUNT",
                        }))
                      }
                    >
                      <h5 className="font-semibold text-gray-800 mb-2">
                        {t("percent_discount")}
                      </h5>
                      <p className="text-sm text-gray-600">
                        {t("percent_discount_description")}
                      </p>
                    </div>

                    {/* Fixed Discount Card */}
                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        couponFormData.type === "FIXED_DISCOUNT"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() =>
                        setCouponFormData((prev) => ({
                          ...prev,
                          type: "FIXED_DISCOUNT",
                        }))
                      }
                    >
                      <h5 className="font-semibold text-gray-800 mb-2">
                        {t("fixed_discount")}
                      </h5>
                      <p className="text-sm text-gray-600">
                        {t("fixed_discount_description")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Coupon Details */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    {t("step_4_title")}
                  </h4>

                  {/* Type-specific fields */}
                  {couponFormData.type === "REWARD_ITEM" && (
                    <div>
                      {/* Reward Item Autocomplete */}
                      <label className="block text-sm font-medium text-gray-700 mt-4">
                        {t("reward_item")} *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={rewardItemsSearchTerm}
                          placeholder={t("search_reward_items_placeholder")}
                          onChange={(e) => {
                            const term = e.target.value;
                            setRewardItemsSearchTerm(term);

                            // Only show dropdown if user is actively typing
                            if (term && term.trim() !== "") {
                              const filtered = (rewardOptions || []).filter(
                                (opt) =>
                                  opt.name
                                    .toLowerCase()
                                    .includes(term.toLowerCase())
                              );
                              setFilteredRewardOptions(filtered);
                            } else {
                              // Hide dropdown if search term is empty
                              setFilteredRewardOptions([]);
                            }

                            // If user starts typing, clear selected id to force explicit selection
                            if (term && couponFormData.rewardItemId) {
                              setCouponFormData((prev) => ({
                                ...prev,
                                rewardItemId: "",
                              }));
                            }
                          }}
                          onFocus={() => {
                            // Only show dropdown if user is actively searching
                            if (
                              rewardItemsSearchTerm &&
                              rewardItemsSearchTerm.trim() !== ""
                            ) {
                              const filtered = (rewardOptions || []).filter(
                                (opt) =>
                                  opt.name
                                    .toLowerCase()
                                    .includes(
                                      rewardItemsSearchTerm.toLowerCase()
                                    )
                              );
                              setFilteredRewardOptions(filtered);
                            }
                          }}
                          className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                          required
                        />
                        {rewardItemsSearchTerm &&
                          filteredRewardOptions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                              {filteredRewardOptions.map((opt) => (
                                <div
                                  key={opt.id}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  onClick={() => {
                                    setCouponFormData((prev) => ({
                                      ...prev,
                                      rewardItemId: opt.id,
                                    }));
                                    setRewardItemsSearchTerm(
                                      `[${opt.categoryName}] ${opt.name}`
                                    );
                                    setFilteredRewardOptions([]);
                                  }}
                                >
                                  [{opt.categoryName}] {opt.name}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Common fields */}
                  <div className="space-y-6">
                    {/* Total Limit Section */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-800 mt-4">
                        {t("total_limit")}
                      </h5>
                      <input
                        type="number"
                        min="0"
                        value={couponFormData.totalLimit || ""}
                        onChange={(e) =>
                          setCouponFormData((prev) => ({
                            ...prev,
                            totalLimit: parseInt(e.target.value) || undefined,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                        placeholder={t("enter_total_limit")}
                      />
                      <p className="text-xs text-gray-600 mt-2">
                        {t("total_limit_info")}
                      </p>
                    </div>

                    {/* Time Window Section */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-800 mt-4">
                        {t("time_window")}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {t("starts_at")}
                          </label>
                          <input
                            type="datetime-local"
                            value={couponFormData.startsAt || ""}
                            onChange={(e) =>
                              setCouponFormData((prev) => ({
                                ...prev,
                                startsAt: e.target.value || undefined,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {t("expires_at")}
                          </label>
                          <input
                            type="datetime-local"
                            value={couponFormData.expiresAt || ""}
                            onChange={(e) =>
                              setCouponFormData((prev) => ({
                                ...prev,
                                expiresAt: e.target.value || undefined,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Validation Note */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                      <p className="text-sm text-yellow-800">
                        {t("validation_info")}
                      </p>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t("image")} *
                    </label>
                    <div className="space-y-4">
                      {/* Image Preview */}
                      {(imagePreview ||
                        (editingCoupon?.imageUrl && !selectedImage)) && (
                        <div className="w-full flex justify-center">
                          <div className="h-40 w-40 overflow-hidden rounded-lg border bg-gray-50">
                            <img
                              src={imagePreview || editingCoupon?.imageUrl}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                      )}

                      {/* File Input */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedImage(file);
                            setCouponFormData((prev) => ({
                              ...prev,
                              imageFile: file,
                            }));
                            // Create preview URL
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              setImagePreview(e.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                        required={!editingCoupon}
                      />

                      {/* Help Text */}
                      <p className="text-sm text-gray-500">
                        {editingCoupon
                          ? t("upload_new_image_to_replace_current")
                          : t("select_image_for_coupon")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Conditions */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    {t("step_5_title")}
                  </h4>

                  {/* Status Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t("status")} *
                    </label>
                    <select
                      value={couponFormData.status}
                      onChange={(e) =>
                        setCouponFormData((prev) => ({
                          ...prev,
                          status: e.target.value as
                            | "DRAFT"
                            | "ACTIVE"
                            | "PAUSED"
                            | "EXPIRED",
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                      required
                    >
                      <option value="DRAFT">{t("draft")}</option>
                      <option value="ACTIVE">{t("active")}</option>
                      <option value="PAUSED">{t("paused")}</option>
                      <option value="EXPIRED">{t("expired")}</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      {t("status_description")}
                    </p>
                  </div>

                  <div className="mt-4">
                    <h5 className="text-md font-medium text-gray-700 mt-3">
                      {t("conditions")}
                    </h5>
                    <p className="text-sm text-gray-600">
                      {t("condition_required_info")}
                    </p>
                  </div>

                  {/* Single condition - always present */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("condition_kind")} *
                        </label>
                        <select
                          value={
                            couponFormData.conditionKind || "POINTS_AT_LEAST"
                          }
                          onChange={(e) =>
                            updateCondition("conditionKind", e.target.value)
                          }
                          className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                          required
                        >
                          <option value="POINTS_AT_LEAST">
                            {t("points_at_least")}
                          </option>
                          <option value="REFERRALS_AT_LEAST">
                            {t("referrals_at_least")}
                          </option>
                          <option value="VISITS_DIFFERENT_RESTAURANTS_AT_LEAST">
                            {t("visits_different_restaurants_at_least")}
                          </option>
                          <option value="VISITS_CITIES_AT_LEAST">
                            {t("visits_cities_at_least")}
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("condition_value")} *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={couponFormData.conditionValue || 0}
                          onChange={(e) =>
                            updateCondition(
                              "conditionValue",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                          placeholder={t("enter_condition_value")}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    currentStep === 1
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {t("previous")}
                </button>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetCouponForm();
                    }}
                    className="secondary-button px-6 py-3"
                  >
                    {t("cancel")}
                  </button>

                  {currentStep < 5 ? (
                    <button
                      type="submit"
                      disabled={!canGoToNextStep()}
                      className={`px-6 py-3 rounded-lg font-medium ${
                        canGoToNextStep()
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {t("next")}
                    </button>
                  ) : (
                    <button type="submit" className="primary-button px-6 py-3">
                      {editingCoupon ? t("update") : t("create")}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;

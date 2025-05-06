import { useState, useEffect } from "react";
import {
  getAllFoodTypes,
  getAllEstablishmentTypes,
  getAllEstablishmentPerks,
  getAllMealTypes,
  getAllPriceCategories,
  updateFilters,
} from "../../services/restaurantService";
import {
  FoodType,
  Restaurant,
  EstablishmentType,
  EstablishmentPerk,
  MealType,
  PriceCategory,
} from "../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

interface FiltersTabProps {
  restaurant: Restaurant;
  onUpdate: (updatedRestaurant: Restaurant) => void;
}

const FiltersTab = ({ restaurant, onUpdate }: FiltersTabProps) => {
  const { t, i18n } = useTranslation();
  const [foodTypes, setFoodTypes] = useState<FoodType[]>([]);
  const [establishmentTypes, setEstablishmentTypes] = useState<
    EstablishmentType[]
  >([]);
  const [establishmentPerks, setEstablishmentPerks] = useState<
    EstablishmentPerk[]
  >([]);
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<number[]>(
    restaurant.foodTypes || []
  );
  const [selectedEstablishmentTypes, setSelectedEstablishmentTypes] = useState<
    number[]
  >(restaurant.establishmentTypes || []);
  const [selectedEstablishmentPerks, setSelectedEstablishmentPerks] = useState<
    number[]
  >(restaurant.establishmentPerks || []);
  const [selectedMealTypes, setSelectedMealTypes] = useState<number[]>(
    restaurant.mealTypes || []
  );
  const [selectedPriceCategory, setSelectedPriceCategory] = useState<
    number | undefined
  >(restaurant.priceCategoryId);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModal, setActiveModal] = useState<
    "food" | "establishment" | "perk" | "meal" | "price" | null
  >(null);
  const [saveStatus, setSaveStatus] = useState(t("all_changes_saved"));

  useEffect(() => {
    const fetchAllFilters = async () => {
      const loadingToastId = toast.loading(t("loading"));

      try {
        const [
          foodTypes,
          establishmentTypes,
          establishmentPerks,
          mealTypes,
          priceCategories,
        ] = await Promise.all([
          getAllFoodTypes(),
          getAllEstablishmentTypes(),
          getAllEstablishmentPerks(),
          getAllMealTypes(),
          getAllPriceCategories(),
        ]);

        setFoodTypes(foodTypes);
        setEstablishmentTypes(establishmentTypes);
        setEstablishmentPerks(establishmentPerks);
        setMealTypes(mealTypes);
        setPriceCategories(priceCategories);
      } catch (error) {
        console.error("Failed to fetch filters", error);
      } finally {
        toast.dismiss(loadingToastId);
      }
    };

    fetchAllFilters();
  }, []);

  useEffect(() => {
    const handleAutoSave = async () => {
      setSaveStatus(t("saving"));
      try {
        const filters = {
          foodTypes: selectedFoodTypes,
          establishmentTypes: selectedEstablishmentTypes,
          establishmentPerks: selectedEstablishmentPerks,
          mealTypes: selectedMealTypes,
          priceCategoryId: selectedPriceCategory,
        };

        await updateFilters(restaurant.id || "", filters);
        setSaveStatus(t("all_changes_saved"));
        onUpdate({
          ...restaurant,
          foodTypes: selectedFoodTypes,
          establishmentTypes: selectedEstablishmentTypes,
          establishmentPerks: selectedEstablishmentPerks,
          mealTypes: selectedMealTypes,
          priceCategoryId: selectedPriceCategory,
        });
      } catch (error) {
        console.error("Failed to auto-save filters", error);
        setSaveStatus(t("failed_to_save_changes"));
      }
    };

    handleAutoSave();
  }, [
    selectedFoodTypes,
    selectedEstablishmentTypes,
    selectedEstablishmentPerks,
    selectedMealTypes,
    selectedPriceCategory,
  ]);

  const handleRemoveItem = (
    id: number,
    type: "food" | "establishment" | "perk" | "meal"
  ) => {
    if (type === "food") {
      setSelectedFoodTypes((prev) => prev.filter((t) => t !== id));
    } else if (type === "establishment") {
      setSelectedEstablishmentTypes((prev) => prev.filter((t) => t !== id));
    } else if (type === "perk") {
      setSelectedEstablishmentPerks((prev) => prev.filter((t) => t !== id));
    } else if (type === "meal") {
      setSelectedMealTypes((prev) => prev.filter((t) => t !== id));
    }
  };

  const handleAddItem = (
    id: number,
    type: "food" | "establishment" | "perk" | "meal" | "price"
  ) => {
    if (type === "food") {
      setSelectedFoodTypes((prev) => [...prev, id]);
    } else if (type === "establishment") {
      setSelectedEstablishmentTypes((prev) => [...prev, id]);
    } else if (type === "perk") {
      setSelectedEstablishmentPerks((prev) => [...prev, id]);
    } else if (type === "meal") {
      setSelectedMealTypes((prev) => [...prev, id]);
    } else if (type === "price") {
      setSelectedPriceCategory(id);
      setActiveModal(null);
    }
  };

  const getModalContent = () => {
    let items: (
      | FoodType
      | EstablishmentType
      | EstablishmentPerk
      | MealType
      | PriceCategory
    )[] = [];
    let selectedItems: number[] = [];
    let title = "";

    if (activeModal === "food") {
      items = foodTypes;
      selectedItems = selectedFoodTypes;
      title = t("add_food_types");
    } else if (activeModal === "establishment") {
      items = establishmentTypes;
      selectedItems = selectedEstablishmentTypes;
      title = t("add_establishment_types");
    } else if (activeModal === "perk") {
      items = establishmentPerks;
      selectedItems = selectedEstablishmentPerks;
      title = t("add_establishment_perks");
    } else if (activeModal === "meal") {
      items = mealTypes;
      selectedItems = selectedMealTypes;
      title = t("add_meal_types");
    } else if (activeModal === "price") {
      items = priceCategories;
      selectedItems = selectedPriceCategory ? [selectedPriceCategory] : [];
      title = t("select_price_category");
    }

    return { items, selectedItems, title };
  };

  const { items, selectedItems, title } = getModalContent();

  // Get names of selected items for each category
  const getSelectedItemNames = (itemsList: any[], selectedIds: number[]) => {
    return selectedIds.map((id) => {
      const item = itemsList.find((item) => item.id === id);
      return i18n.language === "en" ? item?.nameEn : item?.nameHr;
    });
  };

  const selectedFoodTypeNames = getSelectedItemNames(
    foodTypes,
    selectedFoodTypes
  );
  const selectedEstablishmentTypeNames = getSelectedItemNames(
    establishmentTypes,
    selectedEstablishmentTypes
  );
  const selectedEstablishmentPerkNames = getSelectedItemNames(
    establishmentPerks,
    selectedEstablishmentPerks
  );
  const selectedMealTypeNames = getSelectedItemNames(
    mealTypes,
    selectedMealTypes
  );

  const selectedPriceCategoryName = priceCategories.find(
    (pc) => pc.id === selectedPriceCategory
  )
    ? i18n.language === "en"
      ? priceCategories.find((pc) => pc.id === selectedPriceCategory)?.nameEn
      : priceCategories.find((pc) => pc.id === selectedPriceCategory)?.nameHr
    : "";

  const selectedPriceCategoryIcon =
    priceCategories.find((pc) => pc.id === selectedPriceCategory)?.icon || "";

  return (
    <div className="flex flex-col">
      {/* Header with title and save status */}
      <div className="border-b border-gray-200 pb-5 mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{t("filters")}</h2>
        <div className="flex items-center">
          {saveStatus === t("saving") ? (
            <span className="text-sm text-amber-600 flex items-center">
              <svg
                className="animate-spin h-4 w-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {saveStatus}
            </span>
          ) : (
            <span className="text-sm text-green-600 flex items-center">
              <svg
                className="h-4 w-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                ></path>
              </svg>
              {saveStatus}
            </span>
          )}
        </div>
      </div>

      {/* Filter categories */}
      <div className="space-y-8">
        {/* Price Category */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {t("price_category")}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {t("price")}? {t("how_expensive_is_this_restaurant")}
              <span className="text-gray-400 ml-2">({t("optional")})</span>
            </p>

            <div className="flex flex-wrap gap-2">
              {priceCategories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => setSelectedPriceCategory(category.id)}
                  className={`py-1.5 px-4 border border-gray-300 rounded-full flex items-center cursor-pointer transition-all text-sm
                    ${
                      selectedPriceCategory === category.id
                        ? "bg-gray-800 text-white border-gray-800"
                        : "bg-white text-gray-800 hover:bg-gray-100"
                    }`}
                >
                  <span className="mr-1.5">{category.icon}</span>
                  <span className="font-medium">
                    {i18n.language === "en" ? category.nameEn : category.nameHr}
                  </span>
                </div>
              ))}

              {selectedPriceCategory && (
                <button
                  onClick={() => setSelectedPriceCategory(undefined)}
                  className="text-gray-500 hover:text-gray-700 text-xs underline ml-2 self-center"
                >
                  {t("clear")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Establishment Types */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {t("establishment_types")}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {t("select_establishment_types")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4">
              {establishmentTypes.map((type) => (
                <div key={type.id} className="flex items-center">
                  <div
                    className={`w-5 h-5 flex-shrink-0 border rounded-sm mr-2 flex items-center justify-center cursor-pointer
                      ${
                        selectedEstablishmentTypes.includes(type.id)
                          ? "bg-gray-900 border-gray-900"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    onClick={() => {
                      if (selectedEstablishmentTypes.includes(type.id)) {
                        handleRemoveItem(type.id, "establishment");
                      } else {
                        handleAddItem(type.id, "establishment");
                      }
                    }}
                  >
                    {selectedEstablishmentTypes.includes(type.id) && (
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <label
                    className="text-sm cursor-pointer"
                    onClick={() => {
                      if (selectedEstablishmentTypes.includes(type.id)) {
                        handleRemoveItem(type.id, "establishment");
                      } else {
                        handleAddItem(type.id, "establishment");
                      }
                    }}
                  >
                    {i18n.language === "en" ? type.nameEn : type.nameHr}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Meal Types */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {t("meal_types")}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {t("select_meal_types")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4">
              {mealTypes.map((type) => (
                <div key={type.id} className="flex items-center">
                  <div
                    className={`w-5 h-5 flex-shrink-0 border rounded-sm mr-2 flex items-center justify-center cursor-pointer
                      ${
                        selectedMealTypes.includes(type.id)
                          ? "bg-gray-900 border-gray-900"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    onClick={() => {
                      if (selectedMealTypes.includes(type.id)) {
                        handleRemoveItem(type.id, "meal");
                      } else {
                        handleAddItem(type.id, "meal");
                      }
                    }}
                  >
                    {selectedMealTypes.includes(type.id) && (
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <label
                    className="text-sm cursor-pointer"
                    onClick={() => {
                      if (selectedMealTypes.includes(type.id)) {
                        handleRemoveItem(type.id, "meal");
                      } else {
                        handleAddItem(type.id, "meal");
                      }
                    }}
                  >
                    {i18n.language === "en" ? type.nameEn : type.nameHr}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Food Types */}
        <div className="border-b border-gray-200 pb-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {t("food_types")}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {t("select_food_types")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4">
              {foodTypes.map((type) => (
                <div key={type.id} className="flex items-center">
                  <div
                    className={`w-5 h-5 flex-shrink-0 border rounded-sm mr-2 flex items-center justify-center cursor-pointer
                      ${
                        selectedFoodTypes.includes(type.id)
                          ? "bg-gray-900 border-gray-900"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    onClick={() => {
                      if (selectedFoodTypes.includes(type.id)) {
                        handleRemoveItem(type.id, "food");
                      } else {
                        handleAddItem(type.id, "food");
                      }
                    }}
                  >
                    {selectedFoodTypes.includes(type.id) && (
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <label
                    className="text-sm cursor-pointer"
                    onClick={() => {
                      if (selectedFoodTypes.includes(type.id)) {
                        handleRemoveItem(type.id, "food");
                      } else {
                        handleAddItem(type.id, "food");
                      }
                    }}
                  >
                    {i18n.language === "en" ? type.nameEn : type.nameHr}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Establishment Perks */}
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {t("establishment_perks")}
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {t("select_establishment_perks")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4">
              {establishmentPerks.map((perk) => (
                <div key={perk.id} className="flex items-center">
                  <div
                    className={`w-5 h-5 flex-shrink-0 border rounded-sm mr-2 flex items-center justify-center cursor-pointer
                      ${
                        selectedEstablishmentPerks.includes(perk.id)
                          ? "bg-gray-900 border-gray-900"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    onClick={() => {
                      if (selectedEstablishmentPerks.includes(perk.id)) {
                        handleRemoveItem(perk.id, "perk");
                      } else {
                        handleAddItem(perk.id, "perk");
                      }
                    }}
                  >
                    {selectedEstablishmentPerks.includes(perk.id) && (
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <label
                    className="text-sm cursor-pointer"
                    onClick={() => {
                      if (selectedEstablishmentPerks.includes(perk.id)) {
                        handleRemoveItem(perk.id, "perk");
                      } else {
                        handleAddItem(perk.id, "perk");
                      }
                    }}
                  >
                    {i18n.language === "en" ? perk.nameEn : perk.nameHr}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for adding items */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            {/* Modal header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Search input */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder={`${t("search")}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 py-2 pr-3 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* List of options */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {activeModal === "price" ? (
                <div className="grid grid-cols-1 gap-2">
                  {items
                    .filter((item) =>
                      (i18n.language === "en" ? item.nameEn : item.nameHr)
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleAddItem(item.id, activeModal)}
                        className={`flex items-center p-3 rounded-md cursor-pointer hover:bg-blue-50 transition-colors ${
                          selectedItems.includes(item.id)
                            ? "bg-blue-50 ring-1 ring-blue-400"
                            : ""
                        }`}
                      >
                        <span className="text-lg mr-3">{item.icon}</span>
                        <span className="text-gray-800">
                          {i18n.language === "en" ? item.nameEn : item.nameHr}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {items
                    .filter(
                      (item) =>
                        !selectedItems.includes(item.id) &&
                        (i18n.language === "en" ? item.nameEn : item.nameHr)
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleAddItem(item.id, activeModal)}
                        className="flex items-center p-3 rounded-md cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <span className="text-gray-800">
                          {i18n.language === "en" ? item.nameEn : item.nameHr}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* Empty state */}
              {items.filter(
                (item) =>
                  (activeModal === "price" ||
                    !selectedItems.includes(item.id)) &&
                  (i18n.language === "en" ? item.nameEn : item.nameHr)
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                  </svg>
                  <p className="mt-2">{t("no_results_found")}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersTab;

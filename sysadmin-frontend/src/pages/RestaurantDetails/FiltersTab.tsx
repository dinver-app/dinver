import { useState, useEffect } from "react";
import {
  getAllFoodTypes,
  getAllEstablishmentTypes,
  getAllEstablishmentPerks,
  updateFilters,
} from "../../services/restaurantService";
import {
  FoodType,
  Restaurant,
  EstablishmentType,
  EstablishmentPerk,
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
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<number[]>(
    restaurant.food_types || []
  );
  const [selectedEstablishmentTypes, setSelectedEstablishmentTypes] = useState<
    number[]
  >(restaurant.establishment_types || []);
  const [selectedEstablishmentPerks, setSelectedEstablishmentPerks] = useState<
    number[]
  >(restaurant.establishment_perks || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModal, setActiveModal] = useState<
    "food" | "establishment" | "perk" | null
  >(null);
  const [saveStatus, setSaveStatus] = useState(t("all_changes_saved"));

  useEffect(() => {
    const fetchAllFilters = async () => {
      const loadingToastId = toast.loading(t("loading"));

      try {
        const [foodTypes, establishmentTypes, establishmentPerks] =
          await Promise.all([
            getAllFoodTypes(),
            getAllEstablishmentTypes(),
            getAllEstablishmentPerks(),
          ]);

        setFoodTypes(foodTypes);
        setEstablishmentTypes(establishmentTypes);
        setEstablishmentPerks(establishmentPerks);
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
          food_types: selectedFoodTypes,
          establishment_types: selectedEstablishmentTypes,
          establishment_perks: selectedEstablishmentPerks,
        };

        await updateFilters(restaurant.id || "", filters);
        setSaveStatus(t("all_changes_saved"));
        onUpdate({
          ...restaurant,
          food_types: selectedFoodTypes,
          establishment_types: selectedEstablishmentTypes,
          establishment_perks: selectedEstablishmentPerks,
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
  ]);

  const handleRemoveItem = (
    id: number,
    type: "food" | "establishment" | "perk"
  ) => {
    if (type === "food") {
      setSelectedFoodTypes((prev) => prev.filter((t) => t !== id));
    } else if (type === "establishment") {
      setSelectedEstablishmentTypes((prev) => prev.filter((t) => t !== id));
    } else if (type === "perk") {
      setSelectedEstablishmentPerks((prev) => prev.filter((t) => t !== id));
    }
  };

  const handleAddItem = (
    id: number,
    type: "food" | "establishment" | "perk"
  ) => {
    if (type === "food") {
      setSelectedFoodTypes((prev) => [...prev, id]);
    } else if (type === "establishment") {
      setSelectedEstablishmentTypes((prev) => [...prev, id]);
    } else if (type === "perk") {
      setSelectedEstablishmentPerks((prev) => [...prev, id]);
    }
  };

  const getModalContent = () => {
    let items: (FoodType | EstablishmentType | EstablishmentPerk)[] = [];
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
    }

    return { items, selectedItems, title };
  };

  const { items, selectedItems, title } = getModalContent();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="section-title">{t("filters")}</h2>
          <h3 className="section-subtitle">
            {t("manage_your_restaurant_filters")}
          </h3>
        </div>
        <span className="text-sm text-gray-500">{saveStatus}</span>
      </div>
      <div className="h-line"></div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t("establishment_types")}
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedEstablishmentTypes.length > 0 ? (
            selectedEstablishmentTypes.map((id) => {
              const establishmentType = establishmentTypes.find(
                (et) => et.id === id
              );
              return (
                <div
                  key={id}
                  className="flex items-center px-2 py-1 rounded-lg bg-gray-100"
                >
                  <span className="mr-2">{establishmentType?.icon}</span>
                  <span>
                    {i18n.language === "en"
                      ? establishmentType?.name_en
                      : establishmentType?.name_hr}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(id, "establishment")}
                    className="ml-2 text-md text-gray-500 hover:text-gray-700"
                  >
                    &times;
                  </button>
                </div>
              );
            })
          ) : (
            <span className="text-sm text-gray-500">
              {t("no_establishment_types_selected")}
            </span>
          )}
        </div>
        <button
          onClick={() => setActiveModal("establishment")}
          className="mt-4 primary-button text-xs"
        >
          {t("add")}
        </button>
      </div>

      <div className="h-line"></div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t("food_types")}
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedFoodTypes.length > 0 ? (
            selectedFoodTypes.map((id: number) => {
              const foodType = foodTypes.find((ft: FoodType) => ft.id === id);
              return (
                <div
                  key={id}
                  className="flex items-center px-2 py-1 rounded-lg bg-gray-100"
                >
                  <span className="mr-2">{foodType?.icon}</span>
                  <span>
                    {i18n.language === "en"
                      ? foodType?.name_en
                      : foodType?.name_hr}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(id, "food")}
                    className="ml-2 text-md text-gray-500 hover:text-gray-700"
                  >
                    &times;
                  </button>
                </div>
              );
            })
          ) : (
            <span className="text-sm text-gray-500">
              {t("no_food_types_selected")}
            </span>
          )}
        </div>
        <button
          onClick={() => setActiveModal("food")}
          className="mt-4 primary-button text-xs"
        >
          {t("add")}
        </button>
      </div>

      <div className="h-line"></div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t("establishment_perks")}
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedEstablishmentPerks.length > 0 ? (
            selectedEstablishmentPerks.map((id) => {
              const establishmentPerk = establishmentPerks.find(
                (ep) => ep.id === id
              );
              return (
                <div
                  key={id}
                  className="flex items-center px-2 py-1 rounded-lg bg-gray-100"
                >
                  <span className="mr-2">{establishmentPerk?.icon}</span>
                  <span>
                    {i18n.language === "en"
                      ? establishmentPerk?.name_en
                      : establishmentPerk?.name_hr}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(id, "perk")}
                    className="ml-2 text-md text-gray-500 hover:text-gray-700"
                  >
                    &times;
                  </button>
                </div>
              );
            })
          ) : (
            <span className="text-sm text-gray-500">
              {t("no_establishment_perks_selected")}
            </span>
          )}
        </div>
        <button
          onClick={() => setActiveModal("perk")}
          className="mt-4 primary-button text-xs"
        >
          {t("add")}
        </button>
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{title}</h2>
            </div>
            <input
              type="text"
              placeholder={`${t("search")}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            />
            <div className="h-60 overflow-y-auto">
              {items
                .filter(
                  (item) =>
                    !selectedItems.includes(item.id) &&
                    (i18n.language === "en" ? item.name_en : item.name_hr)
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 border-b hover:bg-gray-100 transition"
                  >
                    <span className="flex items-center">
                      {item.icon}{" "}
                      <span className="ml-2">
                        {i18n.language === "en" ? item.name_en : item.name_hr}
                      </span>
                    </span>
                    <button
                      onClick={() => handleAddItem(item.id, activeModal)}
                      className="text-blue-500 hover:underline"
                    >
                      {t("add")}
                    </button>
                  </div>
                ))}
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="mt-4 w-full py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersTab;

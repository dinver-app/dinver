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

  const handleCheckboxChange = (
    id: number,
    type: "food" | "establishment" | "perk",
    isChecked: boolean
  ) => {
    if (type === "food") {
      setSelectedFoodTypes((prev) =>
        isChecked ? [...prev, id] : prev.filter((t) => t !== id)
      );
    } else if (type === "establishment") {
      setSelectedEstablishmentTypes((prev) =>
        isChecked ? [...prev, id] : prev.filter((t) => t !== id)
      );
    } else if (type === "perk") {
      setSelectedEstablishmentPerks((prev) =>
        isChecked ? [...prev, id] : prev.filter((t) => t !== id)
      );
    }
  };

  const handleSave = async () => {
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
      console.error("Failed to save filters", error);
      setSaveStatus(t("failed_to_save_changes"));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t("filters")}</h2>
          <h3 className="text-lg text-gray-600">
            {t("manage_your_restaurant_filters")}
          </h3>
        </div>
        <span className="text-sm text-gray-500">{saveStatus}</span>
      </div>
      <div className="h-line"></div>

      <div className="space-y-6">
        <div>
          <h4 className="text-xl font-semibold mb-2">
            {t("establishment_types")}
          </h4>
          <div className="grid grid-cols-4 gap-4">
            {establishmentTypes.map((establishmentType) => (
              <label
                key={establishmentType.id}
                className="flex items-center space-x-2"
              >
                <input
                  type="checkbox"
                  className="checkbox-custom"
                  checked={selectedEstablishmentTypes.includes(
                    establishmentType.id
                  )}
                  onChange={(e) =>
                    handleCheckboxChange(
                      establishmentType.id,
                      "establishment",
                      e.target.checked
                    )
                  }
                />
                <span>
                  {i18n.language === "en"
                    ? establishmentType.name_en
                    : establishmentType.name_hr}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xl font-semibold mb-2">{t("food_types")}</h4>
          <div className="grid grid-cols-4 gap-4">
            {foodTypes.map((foodType) => (
              <label key={foodType.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="checkbox-custom"
                  checked={selectedFoodTypes.includes(foodType.id)}
                  onChange={(e) =>
                    handleCheckboxChange(foodType.id, "food", e.target.checked)
                  }
                />
                <span>
                  {i18n.language === "en" ? foodType.name_en : foodType.name_hr}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xl font-semibold mb-2">
            {t("establishment_perks")}
          </h4>
          <div className="grid grid-cols-4 gap-4">
            {establishmentPerks.map((establishmentPerk) => (
              <label
                key={establishmentPerk.id}
                className="flex items-center space-x-2"
              >
                <input
                  type="checkbox"
                  className="checkbox-custom"
                  checked={selectedEstablishmentPerks.includes(
                    establishmentPerk.id
                  )}
                  onChange={(e) =>
                    handleCheckboxChange(
                      establishmentPerk.id,
                      "perk",
                      e.target.checked
                    )
                  }
                />
                <span>
                  {i18n.language === "en"
                    ? establishmentPerk.name_en
                    : establishmentPerk.name_hr}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="mt-4 primary-button text-xs">
        {t("save")}
      </button>
    </div>
  );
};

export default FiltersTab;

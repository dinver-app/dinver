import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Allergen } from "../../../interfaces/Interfaces";
import { FaTrash } from "react-icons/fa";

interface AddMenuItemProps {
  onCancel: () => void;
  onSave: (
    name: string,
    price: string,
    description: string,
    imageFile: File | null,
    allergens: string[]
  ) => void;
  allergens: Allergen[];
}

const AddMenuItem: React.FC<AddMenuItemProps> = ({
  onCancel,
  onSave,
  allergens,
}) => {
  const { t } = useTranslation();
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [selectedAllergenIds, setSelectedAllergenIds] = useState<number[]>([]);
  const [allergenSearch, setAllergenSearch] = useState("");
  const [isAllergenDropdownOpen, setAllergenDropdownOpen] = useState(false);

  const handleSave = () => {
    if (itemName && itemPrice) {
      onSave(
        itemName,
        itemPrice,
        itemDescription,
        itemImageFile,
        selectedAllergenIds.map(String)
      );
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setItemImageFile(event.target.files[0]);
      event.target.value = ""; // Reset input to allow re-selection of the same file
    }
  };

  const handleRemoveImage = () => {
    setItemImageFile(null);
  };

  const handleAllergenSelect = (id: number) => {
    setSelectedAllergenIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="py-2">
      <button
        onClick={onCancel}
        className="mr-2 text-gray-500 hover:text-gray-700 text-xs"
      >
        ← {t("back")}
      </button>
      <div className="flex items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {t("add_menu_item")}
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            {t("add_menu_item_description")}
          </p>
        </div>
      </div>
      <div className="h-line"></div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("name")}
        </label>
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
        />
      </div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("price")}
        </label>
        <input
          type="text"
          value={itemPrice}
          onChange={(e) => setItemPrice(e.target.value)}
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
        />
      </div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("description")}
        </label>
        <textarea
          value={itemDescription}
          onChange={(e) => setItemDescription(e.target.value)}
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
        />
      </div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700">
          {t("image")}
        </label>
        <div className="mt-1 flex items-center gap-2 border border-gray-300 rounded p-2">
          <input
            type="file"
            id="fileInput"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            onClick={() => document.getElementById("fileInput")?.click()}
            className="secondary-button text-xs"
          >
            {itemImageFile ? t("choose_another_image") : t("choose_image")}
          </button>
          {itemImageFile ? (
            <div className="flex items-center ml-4">
              <img
                src={URL.createObjectURL(itemImageFile)}
                alt={itemImageFile.name}
                className="w-10 h-10 object-cover rounded mr-2"
              />
              <span className="text-xs">{itemImageFile.name}</span>
            </div>
          ) : (
            <span className="text-xs ml-2">{t("no_file_chosen")}</span>
          )}
          {itemImageFile && (
            <button
              onClick={handleRemoveImage}
              className="text-gray-500 hover:text-gray-700 text-xs ml-auto border border-gray-300 rounded p-1 px-2 hover:bg-gray-100"
            >
              <FaTrash />
            </button>
          )}
        </div>
      </div>
      <div className="mb-3 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Alergeni")}
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder={t("Pretraži alergene")}
            value={allergenSearch}
            onChange={(e) => setAllergenSearch(e.target.value)}
            onFocus={() => setAllergenDropdownOpen(true)}
            onBlur={() => setAllergenDropdownOpen(false)}
            className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
          />
          {isAllergenDropdownOpen && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-auto">
              {allergens
                .filter(
                  (allergen) =>
                    !selectedAllergenIds.includes(allergen.id) &&
                    allergen.name_en
                      .toLowerCase()
                      .includes(allergenSearch.toLowerCase())
                )
                .map((allergen) => (
                  <div
                    key={allergen.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={() => handleAllergenSelect(allergen.id)}
                  >
                    <span className="flex items-center">
                      {allergen.icon} {allergen.name_en}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedAllergenIds.map((id) => {
            const allergen = allergens.find((all) => all.id === id);
            return (
              <div
                key={id}
                className="flex items-center px-2 py-1 rounded-full bg-gray-100"
              >
                <span className="mr-2">{allergen?.icon}</span>
                <span>{allergen?.name_en}</span>
                <button
                  onClick={() => handleAllergenSelect(id)}
                  className="ml-2 text-xs text-red-500 hover:text-red-700"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-start space-x-3 mt-6">
        <button onClick={handleSave} className="primary-button">
          {t("save")}
        </button>
        <button onClick={onCancel} className="secondary-button">
          {t("cancel")}
        </button>
      </div>
    </div>
  );
};

export default AddMenuItem;

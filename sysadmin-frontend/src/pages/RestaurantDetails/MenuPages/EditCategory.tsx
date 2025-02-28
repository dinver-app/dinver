import React, { useState } from "react";
import { Category } from "../../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";

interface EditCategoryProps {
  category: Category;
  onCancel: () => void;
  onSave: (id: string, name: string) => void;
}

const EditCategory: React.FC<EditCategoryProps> = ({
  category,
  onCancel,
  onSave,
}) => {
  const { t } = useTranslation();
  const [categoryName, setCategoryName] = useState(category.name);

  const handleSave = () => {
    if (categoryName) {
      onSave(category.id, categoryName);
    }
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
            {t("Uredi kategoriju")}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {t("Uredi postojeću kategoriju u jelovniku.")}
          </p>
        </div>
      </div>
      <div className="h-line mb-6"></div>
      <div className="mb-6 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("Ime kategorije")}
        </label>
        <input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-700"
        />
      </div>
      <div className="flex justify-start space-x-3">
        <button onClick={handleSave} className="primary-button">
          {t("Spremi")}
        </button>
        <button onClick={onCancel} className="secondary-button">
          {t("Odustani")}
        </button>
      </div>
    </div>
  );
};

export default EditCategory;

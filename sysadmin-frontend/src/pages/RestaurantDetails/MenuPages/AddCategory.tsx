import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface AddCategoryProps {
  onCancel: () => void;
  onSave: (name: string) => void;
}

const AddCategory: React.FC<AddCategoryProps> = ({ onCancel, onSave }) => {
  const { t } = useTranslation();
  const [categoryName, setCategoryName] = useState("");

  const handleSave = () => {
    if (categoryName) {
      onSave(categoryName);
    }
  };

  return (
    <div className="py-2">
      <h2 className="text-xl font-bold text-gray-800">
        {t("Dodaj kategoriju")}
      </h2>
      <p className="text-gray-600 text-sm mb-4">
        {t("Dodaj novu kategoriju u jelovnik.")}
      </p>
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
          {t("save")}
        </button>
        <button onClick={onCancel} className="secondary-button">
          {t("cancel")}
        </button>
      </div>
    </div>
  );
};

export default AddCategory;

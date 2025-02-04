import { useState, useEffect } from "react";
import { updateRestaurant } from "../../services/restaurantService";
import { Restaurant } from "../../interfaces/Interfaces";

interface GeneralTabProps {
  restaurant: Restaurant;
  onUpdate: (updatedRestaurant: Restaurant) => void;
}

const GeneralTab = ({ restaurant, onUpdate }: GeneralTabProps) => {
  const [formData, setFormData] = useState({
    name: restaurant.name || "",
    thumbnail: restaurant.thumbnail || "",
    thumbnail_url: restaurant.thumbnail_url || "",
    address: restaurant.address || "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [saveStatus, setSaveStatus] = useState("All changes saved");

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutoSave = async () => {
    setSaveStatus("Saving...");
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("restaurantId", restaurant.id || "");
      formDataToSend.append("name", formData.name);
      formDataToSend.append("address", formData.address);
      if (file) {
        formDataToSend.append("thumbnail", file);
      }

      await updateRestaurant(restaurant.id || "", formDataToSend);
      setSaveStatus("All changes saved");
      onUpdate({ ...restaurant, ...formData });
    } catch (error) {
      console.error("Failed to auto-save restaurant details", error);
      setSaveStatus("Failed to save changes");
    }
  };

  useEffect(() => {
    const isFormModified = () => {
      return (
        formData.name !== restaurant.name ||
        formData.address !== restaurant.address ||
        formData.thumbnail_url !== restaurant.thumbnail_url
      );
    };

    if (isFormModified()) {
      handleAutoSave();
    }
  }, [formData]);

  return (
    <div>
      <div className="flex justify-end items-center my-4">
        <span className="text-sm text-gray-500">{saveStatus}</span>
      </div>
      <div className="my-4">
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className="mt-1 block w-full p-2 border border-gray-300 rounded"
        />
      </div>
      <div className="my-4">
        <label className="block text-sm font-medium text-gray-700">
          Thumbnail
        </label>
        {formData.thumbnail_url ? (
          <img
            src={formData.thumbnail_url}
            alt="Thumbnail"
            className="mb-2 w-32 h-32 object-cover cursor-pointer"
            onClick={() => document.getElementById("fileInput")?.click()}
          />
        ) : (
          <div
            className="mb-2 w-32 h-32 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer"
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            <span className="text-sm text-gray-500 p-2 text-center">
              Click to add image
            </span>
          </div>
        )}
        <input
          id="fileInput"
          type="file"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
              const reader = new FileReader();
              reader.onload = (event) => {
                setFormData((prev) => ({
                  ...prev,
                  thumbnail_url: event.target?.result as string,
                }));
              };
              reader.readAsDataURL(e.target.files[0]);
            }
          }}
        />
        <p className="text-sm text-gray-500">Click the image to change it</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Address
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          className="mt-1 block w-full p-2 border border-gray-300 rounded"
        />
      </div>
    </div>
  );
};

export default GeneralTab;

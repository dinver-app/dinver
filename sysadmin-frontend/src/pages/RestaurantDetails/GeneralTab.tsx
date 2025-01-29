import { useState } from "react";
import { updateRestaurant } from "../../services/restaurantService";
import toast from "react-hot-toast";
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
    description: restaurant.description || "",
    types: restaurant.types || "",
    address: restaurant.address || "",
  });

  const [file, setFile] = useState<File | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("restaurantId", restaurant.id || "");
      formDataToSend.append("name", formData.name);
      formDataToSend.append(
        "description",
        Array.isArray(formData.description)
          ? formData.description.join(", ")
          : formData.description
      );
      formDataToSend.append(
        "types",
        Array.isArray(formData.types)
          ? formData.types.join(", ")
          : formData.types
      );
      formDataToSend.append(
        "address",
        Array.isArray(formData.address)
          ? formData.address.join(", ")
          : formData.address
      );
      if (file) {
        formDataToSend.append("thumbnail", file);
      }

      console.log(restaurant.id);

      console.log(formDataToSend);

      const updatedRestaurant = await updateRestaurant(
        restaurant.id || "",
        formDataToSend
      );
      onUpdate(updatedRestaurant);
      toast.success("Restaurant details updated successfully");
    } catch (error) {
      console.error("Failed to update restaurant details", error);
      toast.error("Failed to update restaurant details");
    }
  };

  const handleImageClick = () => {
    document.getElementById("fileInput")?.click();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className="mt-1 block w-full p-2 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Thumbnail
        </label>
        {formData.thumbnail_url ? (
          <img
            src={formData.thumbnail_url}
            alt="Thumbnail"
            className="mb-2 w-32 h-32 object-cover cursor-pointer"
            onClick={handleImageClick}
          />
        ) : (
          <div
            className="mb-2 w-32 h-32 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer"
            onClick={handleImageClick}
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
        <p className="text-sm text-gray-500">
          Click the image to select a new one
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          className="mt-1 block w-full p-2 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Types</label>
        <input
          type="text"
          name="types"
          value={formData.types}
          onChange={handleInputChange}
          className="mt-1 block w-full p-2 border border-gray-300 rounded"
        />
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
      <button onClick={handleSave} className="primary-button mt-4">
        Save
      </button>
    </div>
  );
};

export default GeneralTab;

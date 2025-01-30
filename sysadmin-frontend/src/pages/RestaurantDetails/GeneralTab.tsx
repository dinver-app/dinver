import { useState, useEffect } from "react";
import {
  updateRestaurant,
  getAllFoodTypes,
  getAllVenuePerks,
} from "../../services/restaurantService";
import { FoodType, Restaurant, VenuePerk } from "../../interfaces/Interfaces";

interface GeneralTabProps {
  restaurant: Restaurant;
  onUpdate: (updatedRestaurant: Restaurant) => void;
}

const GeneralTab = ({ restaurant }: GeneralTabProps) => {
  const [formData, setFormData] = useState({
    name: restaurant.name || "",
    thumbnail: restaurant.thumbnail || "",
    thumbnail_url: restaurant.thumbnail_url || "",
    description: restaurant.description || "",
    types: restaurant.types || [],
    venue_perks: restaurant.venue_perks || [],
    address: restaurant.address || "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [foodTypes, setFoodTypes] = useState<FoodType[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    formData.types.map((type) => type.trim())
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen2, setIsModalOpen2] = useState(false);
  const [venuePerks, setVenuePerks] = useState<VenuePerk[]>([]);
  const [selectedVenuePerks, setSelectedVenuePerks] = useState<string[]>(
    formData.venue_perks.map((perk) => perk.trim())
  );
  const [saveStatus, setSaveStatus] = useState("All changes saved");

  useEffect(() => {
    const fetchFoodTypes = async () => {
      try {
        const types = await getAllFoodTypes();
        setFoodTypes(types);
      } catch (error) {
        console.error("Failed to fetch food types", error);
      }
    };
    fetchFoodTypes();

    const fetchVenueTypes = async () => {
      try {
        const perks = await getAllVenuePerks();
        setVenuePerks(perks);
      } catch (error) {
        console.error("Failed to fetch venue perks", error);
      }
    };
    fetchVenueTypes();
  }, []);

  useEffect(() => {
    const handleAutoSave = async () => {
      setSaveStatus("Saving...");
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
        formDataToSend.append("types", selectedTypes.join(", "));
        formDataToSend.append("venue_perks", selectedVenuePerks.join(", "));
        formDataToSend.append(
          "address",
          Array.isArray(formData.address)
            ? formData.address.join(", ")
            : formData.address
        );
        if (file) {
          formDataToSend.append("thumbnail", file);
        }

        await updateRestaurant(restaurant.id || "", formDataToSend);
        setSaveStatus("All changes saved");
      } catch (error) {
        console.error("Failed to auto-save restaurant details", error);
        setSaveStatus("Failed to save changes");
      }
    };

    if (isFormModified()) {
      handleAutoSave();
    }
  }, [formData, selectedTypes, selectedVenuePerks, file]);

  const isFormModified = () => {
    return (
      formData.name !== restaurant.name ||
      formData.thumbnail !== restaurant.thumbnail ||
      formData.thumbnail_url !== restaurant.thumbnail_url ||
      formData.description !== restaurant.description ||
      formData.address !== restaurant.address ||
      selectedTypes.join(", ") !== formData.types.join(", ") ||
      selectedVenuePerks.join(", ") !== formData.venue_perks.join(", ") ||
      file !== null
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRemoveType = (type: string) => {
    setSelectedTypes((prev) => prev.filter((t) => t !== type));
  };

  const handleAddType = (type: string) => {
    setSelectedTypes((prev) => [...prev, type]);
  };

  const handleRemoveVenuePerk = (type: string) => {
    setSelectedVenuePerks((prev) => prev.filter((t) => t !== type));
  };

  const handleAddVenuePerk = (type: string) => {
    setSelectedVenuePerks((prev) => [...prev, type]);
  };

  const handleImageClick = () => {
    document.getElementById("fileInput")?.click();
  };

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
        <p className="text-sm text-gray-500">Click the image to change it</p>
      </div>
      {/* <div className="my-4">
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          className="mt-1 block w-full p-2 border border-gray-300 rounded"
        />
      </div> */}
      <div className="my-4">
        <label className="block text-sm font-medium text-gray-700">
          Food Types
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTypes.map((type) => {
            const foodType = foodTypes.find((ft) => ft.name === type);
            return (
              <div
                key={type}
                className="flex items-center px-2 py-1 rounded-full bg-gray-100"
              >
                <span className="mr-2">{foodType?.icon}</span>
                <span>{type}</span>
                <button
                  onClick={() => handleRemoveType(type)}
                  className="ml-2 text-xs text-red-500 hover:text-red-700"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 primary-button text-xs"
        >
          Add
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Food Types</h2>
            </div>
            <input
              type="text"
              placeholder="Search food types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            />
            <div className="h-60 overflow-y-auto">
              {foodTypes
                .filter(
                  (type) =>
                    !selectedTypes.includes(type.name) &&
                    type.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((type) => (
                  <div
                    key={type.name}
                    className="flex items-center justify-between p-2 border-b hover:bg-gray-100 transition"
                  >
                    <span className="flex items-center">
                      {type.icon} <span className="ml-2">{type.name}</span>
                    </span>
                    <button
                      onClick={() => handleAddType(type.name)}
                      className="text-blue-500 hover:underline"
                    >
                      Add
                    </button>
                  </div>
                ))}
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="my-4">
        <label className="block text-sm font-medium text-gray-700">
          Venue Perks
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedVenuePerks.map((type) => {
            const venuePerk = venuePerks.find((vt) => vt.name === type);
            return (
              <div
                key={type}
                className="flex items-center px-2 py-1 rounded-full bg-gray-200"
              >
                <span className="mr-2">{venuePerk?.icon}</span>
                <span>{type}</span>
                <button
                  onClick={() => handleRemoveVenuePerk(type)}
                  className="ml-2 text-xs text-red-500 hover:text-red-700"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setIsModalOpen2(true)}
          className="mt-4 primary-button text-xs"
        >
          Add
        </button>
      </div>

      {isModalOpen2 && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Venue Perks</h2>
            </div>
            <input
              type="text"
              placeholder="Search venue perks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            />
            <div className="h-60 overflow-y-auto">
              {venuePerks
                .filter(
                  (type) =>
                    !selectedVenuePerks.includes(type.name) &&
                    type.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((type) => (
                  <div
                    key={type.name}
                    className="flex items-center justify-between p-2 border-b hover:bg-gray-100 transition"
                  >
                    <span className="flex items-center">
                      {type.icon} <span className="ml-2">{type.name}</span>
                    </span>
                    <button
                      onClick={() => handleAddVenuePerk(type.name)}
                      className="text-blue-500 hover:underline"
                    >
                      Add
                    </button>
                  </div>
                ))}
            </div>
            <button
              onClick={() => setIsModalOpen2(false)}
              className="mt-4 w-full py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

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

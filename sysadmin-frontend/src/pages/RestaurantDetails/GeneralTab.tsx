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
    website_url: restaurant.website_url || "",
    fb_url: restaurant.fb_url || "",
    ig_url: restaurant.ig_url || "",
    phone: restaurant.phone || "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [saveStatus, setSaveStatus] = useState("All changes saved");
  const [errors, setErrors] = useState({
    website_url: "",
    fb_url: "",
    ig_url: "",
    phone: "",
  });

  const validateInput = (name: string, value: string) => {
    let error = "";
    const urlPattern = new RegExp(
      "^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$",
      "i"
    );
    const phonePattern = /^\+?[0-9\s]{7,20}$/;

    if (value.trim() === "") {
      // Skip validation if the value is empty
      error = "";
    } else if (name.includes("url") && !urlPattern.test(value)) {
      error = "Please enter a valid URL.";
    } else if (name === "phone" && !phonePattern.test(value)) {
      error = "Please enter a valid phone number.";
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateInput(name, value);
  };

  const handleAutoSave = async () => {
    setSaveStatus("Saving...");
    console.log("Saving...");
    console.log(errors.website_url === "" ? formData.website_url : "");
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("restaurantId", restaurant.id || "");
      formDataToSend.append("name", formData.name);
      formDataToSend.append("address", formData.address);
      formDataToSend.append(
        "website_url",
        errors.website_url === "" ? formData.website_url : ""
      );
      formDataToSend.append(
        "fb_url",
        errors.fb_url === "" ? formData.fb_url : ""
      );
      formDataToSend.append(
        "ig_url",
        errors.ig_url === "" ? formData.ig_url : ""
      );
      formDataToSend.append("phone", errors.phone === "" ? formData.phone : "");
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
    Object.entries(formData).forEach(([name, value]) => {
      validateInput(name, value);
    });
  }, []);

  useEffect(() => {
    const isFormModified = () => {
      return (
        formData.name !== restaurant.name ||
        formData.address !== restaurant.address ||
        formData.thumbnail_url !== restaurant.thumbnail_url ||
        formData.website_url !== restaurant.website_url ||
        formData.fb_url !== restaurant.fb_url ||
        formData.ig_url !== restaurant.ig_url ||
        formData.phone !== restaurant.phone
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
      <div className="my-4">
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Website URL
          </label>
          <input
            type="text"
            name="website_url"
            value={formData.website_url}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
          />
          {errors.website_url && (
            <p className="text-sm text-red-500">{errors.website_url}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Facebook URL
          </label>
          <input
            type="text"
            name="fb_url"
            value={formData.fb_url}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
          />
          {errors.fb_url && (
            <p className="text-sm text-red-500">{errors.fb_url}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Instagram URL
          </label>
          <input
            type="text"
            name="ig_url"
            value={formData.ig_url}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
          />
          {errors.ig_url && (
            <p className="text-sm text-red-500">{errors.ig_url}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralTab;

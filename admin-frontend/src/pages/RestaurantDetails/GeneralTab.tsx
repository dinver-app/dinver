import { useState, useEffect } from "react";
import { updateRestaurant } from "../../services/restaurantService";
import { Restaurant } from "../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

interface GeneralTabProps {
  restaurant: Restaurant;
  onUpdate: (updatedRestaurant: Restaurant) => void;
}

const GeneralTab = ({ restaurant, onUpdate }: GeneralTabProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: restaurant.name || "",
    thumbnail: restaurant.thumbnail || "",
    thumbnail_url: restaurant.thumbnail_url || "",
    address: restaurant.address || "",
    website_url: restaurant.website_url || "",
    fb_url: restaurant.fb_url || "",
    ig_url: restaurant.ig_url || "",
    tt_url: restaurant.tt_url || "",
    phone: restaurant.phone || "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState({
    website_url: "",
    fb_url: "",
    ig_url: "",
    tt_url: "",
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
      error = t("please_enter_a_valid_url");
    } else if (name === "phone" && !phonePattern.test(value)) {
      error = t("please_enter_a_valid_phone_number");
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

  const handleSave = async () => {
    const toastId = toast.loading(t("saving_changes"));
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
      formDataToSend.append(
        "tt_url",
        errors.tt_url === "" ? formData.tt_url : ""
      );
      formDataToSend.append("phone", errors.phone === "" ? formData.phone : "");
      if (file) {
        formDataToSend.append("thumbnail", file);
      }

      await updateRestaurant(restaurant.id || "", formDataToSend);
      onUpdate({ ...restaurant, ...formData });

      // Show success toast
      toast.success(t("changes_saved_successfully"), { id: toastId });
    } catch (error) {
      console.error("Failed to save restaurant details", error);
      // Show error toast
      toast.error(t("failed_to_save_changes"), { id: toastId });
    }
  };

  useEffect(() => {
    Object.entries(formData).forEach(([name, value]) => {
      validateInput(name, value);
    });
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="section-title">{t("general_information")}</h2>
          <h3 className="section-subtitle">
            {t("manage_your_restaurant_general_information")}
          </h3>
        </div>
        <button onClick={handleSave} className="primary-button">
          {t("save")}
        </button>
      </div>
      <div className="h-line"></div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t("name")}
        </label>
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
          {t("thumbnail")}
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
              {t("click_to_add_image")}
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
          {t("click_the_image_to_change_it")}
        </p>
      </div>
      <div className="my-4">
        <label className="block text-sm font-medium text-gray-700">
          {t("address")}
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
            {t("website_url")}
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
            {t("phone")}
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
            {t("facebook_url")}
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
            {t("instagram_url")}
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
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("tiktok_url")}
          </label>
          <input
            type="text"
            name="tt_url"
            value={formData.tt_url}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
          />
          {errors.tt_url && (
            <p className="text-sm text-red-500">{errors.tt_url}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralTab;

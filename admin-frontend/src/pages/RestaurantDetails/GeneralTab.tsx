import { useState, useEffect } from "react";
import { updateRestaurant } from "../../services/restaurantService";
import { Restaurant } from "../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useRole } from "../../context/RoleContext";

interface GeneralTabProps {
  restaurant: Restaurant;
  onUpdate: (updatedRestaurant: Restaurant) => void;
}

const GeneralTab = ({ restaurant, onUpdate }: GeneralTabProps) => {
  const { t } = useTranslation();
  const { role } = useRole();
  const [formData, setFormData] = useState({
    name: restaurant.name || "",
    thumbnail: restaurant.thumbnail || "",
    thumbnailUrl: restaurant.thumbnailUrl || "",
    address: restaurant.address || "",
    place: restaurant.place || "",
    websiteUrl: restaurant.websiteUrl || "",
    fbUrl: restaurant.fbUrl || "",
    igUrl: restaurant.igUrl || "",
    ttUrl: restaurant.ttUrl || "",
    phone: restaurant.phone || "",
    email: restaurant.email || "",
    description: restaurant.description || "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState({
    websiteUrl: "",
    fbUrl: "",
    igUrl: "",
    ttUrl: "",
    phone: "",
    email: "",
    description: "",
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

    // Check description length
    if (name === "description" && value.length > 150) {
      setErrors((prev) => ({
        ...prev,
        description: t("description_too_long"),
      }));
      return;
    }

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
      formDataToSend.append("description", formData.description);
      formDataToSend.append(
        "websiteUrl",
        errors.websiteUrl === "" ? formData.websiteUrl : ""
      );
      formDataToSend.append("fbUrl", errors.fbUrl === "" ? formData.fbUrl : "");
      formDataToSend.append("igUrl", errors.igUrl === "" ? formData.igUrl : "");
      formDataToSend.append("ttUrl", errors.ttUrl === "" ? formData.ttUrl : "");
      formDataToSend.append("phone", errors.phone === "" ? formData.phone : "");
      formDataToSend.append("email", errors.email === "" ? formData.email : "");
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
        {role !== "helper" && (
          <button onClick={handleSave} className="primary-button">
            {t("save")}
          </button>
        )}
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
          disabled={!(role === "owner" || role === "admin")}
        />
      </div>

      <div className="my-4">
        <label className="block text-sm font-medium text-gray-700">
          {t("restaurant_description")}
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder={t("restaurant_description_placeholder")}
          className="mt-1 block w-full p-2 border border-gray-300 rounded h-24 resize-none"
          maxLength={150}
          disabled={!(role === "owner" || role === "admin")}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description}</p>
        )}
        <div className="text-xs text-gray-500 mt-1 text-right">
          {formData.description.length}/150
        </div>
      </div>

      <div className="my-4">
        <label className="block text-sm font-medium text-gray-700">
          {t("thumbnail")}
        </label>
        <p className="text-xs text-gray-500 mb-2">
          {t("recommendation")}: 16:9 {t("landscape")} ({t("horizontal")}){" "}
          {t("image")} (1280×720 px)
        </p>
        {formData.thumbnailUrl ? (
          <img
            src={formData.thumbnailUrl}
            alt="Thumbnail"
            className="mb-2 w-64 h-36 object-cover cursor-pointer rounded-md"
            onClick={() =>
              role !== "helper" && document.getElementById("fileInput")?.click()
            }
          />
        ) : (
          <div
            className="mb-2 w-64 h-36 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer rounded-md"
            onClick={() =>
              role !== "helper" && document.getElementById("fileInput")?.click()
            }
          >
            <span className="text-sm text-gray-500 p-2 text-center">
              {t("click_to_add_image")}
            </span>
          </div>
        )}
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
              const reader = new FileReader();
              reader.onload = (event) => {
                setFormData((prev) => ({
                  ...prev,
                  thumbnailUrl: event.target?.result as string,
                }));
              };
              reader.readAsDataURL(e.target.files[0]);
            }
          }}
          disabled={!(role === "owner" || role === "admin")}
        />
        <p className="text-sm text-gray-500">
          {t("click_the_image_to_change_it")}
        </p>
      </div>

      <div className="my-4 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("address")}
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
            disabled={!(role === "owner" || role === "admin")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("place")}
          </label>
          <input
            type="text"
            name="place"
            value={formData.place}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
            disabled={!(role === "owner" || role === "admin")}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("email")}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
            disabled={!(role === "owner" || role === "admin")}
          />
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
            disabled={!(role === "owner" || role === "admin")}
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
            name="fbUrl"
            value={formData.fbUrl}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
            disabled={!(role === "owner" || role === "admin")}
          />
          {errors.fbUrl && (
            <p className="text-sm text-red-500">{errors.fbUrl}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("instagram_url")}
          </label>
          <input
            type="text"
            name="igUrl"
            value={formData.igUrl}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
            disabled={!(role === "owner" || role === "admin")}
          />
          {errors.igUrl && (
            <p className="text-sm text-red-500">{errors.igUrl}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("tiktok_url")}
          </label>
          <input
            type="text"
            name="ttUrl"
            value={formData.ttUrl}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
            disabled={!(role === "owner" || role === "admin")}
          />
          {errors.ttUrl && (
            <p className="text-sm text-red-500">{errors.ttUrl}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralTab;

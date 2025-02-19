import { useEffect, useState } from "react";
import {
  getMenuItems,
  getCategoryItems,
  createCategory,
  updateCategory,
  createMenuItem,
  updateMenuItem,
  deleteCategory,
  deleteMenuItem,
  getAllAllergens,
  updateCategoryOrder,
  updateItemOrder,
} from "../../services/menuService";
import { MenuItem, Category } from "../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

interface Allergen {
  id: number;
  name_en: string;
  name_hr: string;
  icon: string;
}

const MenuTab = ({ restaurantId }: { restaurantId: string | undefined }) => {
  const language = localStorage.getItem("language") || "en";
  const { t } = useTranslation();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesForSorting, setCategoriesForSorting] = useState<Category[]>(
    []
  );
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemPrice, setNewItemPrice] = useState<string>("");
  const [newItemDescription, setNewItemDescription] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [isAddCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setEditCategoryModalOpen] = useState(false);
  const [isAddItemModalOpen, setAddItemModalOpen] = useState(false);
  const [isEditItemModalOpen, setEditItemModalOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState<string>("");
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState<string>("");
  const [editItemPrice, setEditItemPrice] = useState<string>("");
  const [editItemDescription, setEditItemDescription] = useState<string>("");
  const [editItemImage, setEditItemImage] = useState<string | null>(null);
  const [newItemImageFile, setNewItemImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [selectedAllergenIds, setSelectedAllergenIds] = useState<string[]>([]);
  const [allergenSearch, setAllergenSearch] = useState("");
  const [isAllergenDropdownOpen, setAllergenDropdownOpen] = useState(false);
  const [isDeleteCategoryModalOpen, setDeleteCategoryModalOpen] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
  );
  const [isDeleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  const [isOrderCategoriesModalOpen, setIsOrderCategoriesModalOpen] =
    useState(false);
  const [isOrderItemsModalOpen, setIsOrderItemsModalOpen] = useState(false);

  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [itemOrder, setItemOrder] = useState<string[]>([]);

  const [itemsForSorting, setItemsForSorting] = useState<MenuItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [uncategorizedItemsForSorting, setUncategorizedItemsForSorting] =
    useState<MenuItem[]>([]);
  const [
    isOrderUncategorizedItemsModalOpen,
    setIsOrderUncategorizedItemsModalOpen,
  ] = useState(false);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const items: MenuItem[] = await getMenuItems(restaurantId as string);
        setMenuItems(items);
        const cats: Category[] = await getCategoryItems(restaurantId as string);
        setCategories(cats);
        setCategoriesForSorting(cats);
        setCategoryOrder(cats.map((cat) => cat.id));
      } catch (error) {
        console.error("Failed to fetch menu data", error);
      }
    };

    fetchMenuData();
  }, [restaurantId]);

  useEffect(() => {
    const fetchAllergens = async () => {
      const data = await getAllAllergens();
      setAllergens(data);
    };
    fetchAllergens();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    setIsLoading(true);
    try {
      const category: Category = await createCategory({
        name: newCategoryName,
        restaurantId: restaurantId as string,
      });
      setCategories([...categories, category]);
      setCategoriesForSorting([...categories, category]);
      setNewCategoryName("");
      setAddCategoryModalOpen(false);
      toast.success(t("category_created"));
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(t(errorMessage));
      console.error("Failed to create category", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMenuItem = async () => {
    if (!newItemName && !newItemPrice) {
      toast.error(t("item_name_and_price_required"));
      return;
    }
    if (!newItemName) {
      toast.error(t("item_name_required"));
      return;
    }
    if (!newItemPrice) {
      toast.error(t("price_required"));
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", newItemName);
      formData.append("price", newItemPrice);
      formData.append("restaurantId", restaurantId as string);
      if (selectedCategoryId) {
        formData.append("categoryId", selectedCategoryId);
      }
      if (newItemImageFile) {
        formData.append("imageFile", newItemImageFile);
      }
      formData.append("description", newItemDescription);

      selectedAllergenIds.forEach((id) => {
        formData.append("allergenIds", id);
      });

      const menuItem: MenuItem = await createMenuItem(formData);
      setMenuItems([...menuItems, menuItem]);
      setNewItemName("");
      setNewItemPrice("");
      setSelectedCategoryId(null);
      setNewItemImageFile(null);
      setNewItemDescription("");
      setAddItemModalOpen(false);
      setSelectedAllergenIds([]);
      toast.success(t("menu_item_created"));
    } catch (error) {
      console.error("Failed to create menu item", error);
      toast.error(t("failed_to_create_menu_item"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategory = async () => {
    setIsLoading(true);
    if (!editCategoryId || !editCategoryName) return;
    try {
      const updatedCategory: Category = await updateCategory(editCategoryId, {
        name: editCategoryName,
      });
      setCategories(
        categories.map((cat) =>
          cat.id === editCategoryId ? updatedCategory : cat
        )
      );
      setCategoriesForSorting(
        categories.map((cat) =>
          cat.id === editCategoryId ? updatedCategory : cat
        )
      );
      setEditCategoryId(null);
      setEditCategoryName("");
      setEditCategoryModalOpen(false);
      toast.success(t("category_updated"));
    } catch (error) {
      console.error("Failed to update category", error);
      toast.error(t("failed_to_update_category"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMenuItem = async () => {
    if (!editItemId) {
      toast.error(t("item_id_required"));
      return;
    }
    if (!editItemName) {
      toast.error(t("item_name_required"));
      return;
    }
    if (!editItemPrice) {
      toast.error(t("price_required"));
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", editItemName);
      formData.append("price", editItemPrice);
      formData.append("restaurantId", restaurantId as string);
      formData.append("categoryId", selectedCategoryId || "");
      if (newItemImageFile) {
        formData.append("imageFile", newItemImageFile);
      }
      if (removeImage) {
        formData.append("removeImage", "true");
      }
      selectedAllergenIds.forEach((id) => {
        formData.append("allergenIds", id);
      });
      formData.append("description", editItemDescription || "");

      const updatedMenuItem: MenuItem = await updateMenuItem(
        editItemId,
        formData
      );
      setMenuItems(
        menuItems.map((item) =>
          item.id === editItemId ? updatedMenuItem : item
        )
      );
      setEditItemId(null);
      setEditItemName("");
      setEditItemPrice("");
      setEditItemDescription("");
      setEditItemImage(null);
      setSelectedCategoryId(null);
      setNewItemImageFile(null);
      setRemoveImage(false);
      setNewItemDescription("");
      setEditItemModalOpen(false);
      setSelectedAllergenIds([]);
      toast.success(t("menu_item_updated"));
    } catch (error) {
      console.error("Failed to update menu item", error);
      toast.error(t("failed_to_update_menu_item"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteCategory(id);
      setCategories(categories.filter((cat) => cat.id !== id));
      setCategoriesForSorting(categories.filter((cat) => cat.id !== id));
      setDeleteCategoryModalOpen(false);
      toast.success(t("category_deleted"));
    } catch (error) {
      console.error("Failed to delete category", error);
      toast.error(t("failed_to_delete_category"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteMenuItem(id);
      setMenuItems(menuItems.filter((item) => item.id !== id));
      setDeleteItemModalOpen(false);
      toast.success(t("menu_item_deleted"));
    } catch (error) {
      console.error("Failed to delete menu item", error);
      toast.error(t("failed_to_delete_menu_item"));
    } finally {
      setIsLoading(false);
    }
  };

  const openEditCategoryModal = (category: Category) => {
    setEditCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryModalOpen(true);
  };

  const openEditItemModal = (item: MenuItem) => {
    setEditItemId(item.id);
    setEditItemName(item.name);
    setEditItemPrice(item.price.toString());
    setSelectedCategoryId(item.categoryId || null);
    setEditItemDescription(item.description || "");
    setEditItemImage(item.imageUrl || null);
    setRemoveImage(false);
    setEditItemModalOpen(true);

    const allergenObjects = item.allergens?.map((id) =>
      allergens.find((all) => all.id.toString() === id.toString())
    );

    setSelectedAllergenIds(
      allergenObjects
        ?.filter((allergen): allergen is Allergen => allergen !== undefined)
        .map((allergen) => allergen.id.toString()) || []
    );
  };

  const renderMenuItems = (categoryId: string | null) => {
    return menuItems
      .filter((item) => item.categoryId === categoryId)
      .map((item) => {
        const itemAllergens = item.allergens?.map((id) =>
          allergens.find((all) => all.id.toString() === id.toString())
        );

        return (
          <li
            key={item.id}
            className="flex flex-col md:flex-row justify-between items-center p-6 mb-6 border border-gray-200 rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex items-center space-x-6">
              <div className="w-36 h-24 flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800">{item.name}</h3>
                <p className="text-gray-600 text-lg">
                  {item.price.toString().replace(".", ",")} €
                </p>
                <p className="text-sm text-gray-700 mt-2">{item.description}</p>
                <div className="flex space-x-4 mt-3">
                  <div className="flex items-center space-x-2">
                    {itemAllergens && itemAllergens?.length > 0 && (
                      <span className="font-semibold text-gray-800">
                        {t("allergens")}:
                      </span>
                    )}
                    {itemAllergens?.map((allergen) => (
                      <span
                        key={allergen?.id}
                        className="tooltip cursor-default"
                        title={
                          language === "en"
                            ? allergen?.name_en
                            : allergen?.name_hr
                        }
                      >
                        {allergen?.icon}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-2 mt-4 md:mt-0 flex space-x-4">
              <button
                onClick={() => openEditItemModal(item)}
                className="secondary-button"
              >
                {t("edit")}
              </button>
              <button
                onClick={() => handleDeleteItemModal(item)}
                className="delete-button"
              >
                {t("delete")}
              </button>
            </div>
          </li>
        );
      });
  };

  const handleAllergenSelect = (id: string) => {
    setSelectedAllergenIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleModalClose = () => {
    setAllergenSearch("");
    setAllergenDropdownOpen(false);
    setSelectedAllergenIds([]);
    setEditItemId(null);
    setEditItemName("");
    setEditItemPrice("");
    setEditItemDescription("");
    setEditItemImage(null);
    setSelectedCategoryId(null);
    setNewItemImageFile(null);
    setRemoveImage(false);
    setEditItemModalOpen(false);
  };

  const handleDeleteCategoryModal = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteCategoryModalOpen(true);
  };

  const handleDeleteItemModal = (item: MenuItem) => {
    setItemToDelete(item);
    setDeleteItemModalOpen(true);
  };

  const handleSaveCategoryOrder = async () => {
    setIsLoading(true);
    try {
      await updateCategoryOrder(categoryOrder);
      setCategories(
        categories.sort(
          (a, b) => categoryOrder.indexOf(a.id) - categoryOrder.indexOf(b.id)
        )
      );
      setCategoriesForSorting(
        categories.sort(
          (a, b) => categoryOrder.indexOf(a.id) - categoryOrder.indexOf(b.id)
        )
      );
      setIsOrderCategoriesModalOpen(false);
      toast.success(t("category_order_updated"));
    } catch (error) {
      console.error("Failed to update category order", error);
      toast.error(t("failed_to_update_category_order"));
    } finally {
      setIsLoading(false);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const updatedCategories = Array.from(categories);
    const [movedCategory] = updatedCategories.splice(result.source.index, 1);
    updatedCategories.splice(result.destination.index, 0, movedCategory);

    setCategoriesForSorting(updatedCategories);
    setCategoryOrder(updatedCategories.map((cat) => cat.id));
  };

  const openSortItemsModal = (categoryId: string) => {
    const itemsInCategory = menuItems.filter(
      (item) => item.categoryId === categoryId
    );
    setItemsForSorting(itemsInCategory);
    setItemOrder(itemsInCategory.map((item) => item.id));
    setIsOrderItemsModalOpen(true);
  };

  const handleSaveItemOrder = async () => {
    setIsLoading(true);
    try {
      await updateItemOrder(itemOrder);

      const updatedMenuItems = [...menuItems];
      updatedMenuItems.sort(
        (a, b) => itemOrder.indexOf(a.id) - itemOrder.indexOf(b.id)
      );
      setMenuItems(updatedMenuItems);

      setIsOrderItemsModalOpen(false);
      toast.success(t("item_order_updated"));
    } catch (error) {
      console.error("Failed to update item order", error);
      toast.error(t("failed_to_update_item_order"));
    } finally {
      setIsLoading(false);
    }
  };

  const onItemDragEnd = (result: any) => {
    if (!result.destination) return;

    const updatedItems = Array.from(itemsForSorting);
    const [movedItem] = updatedItems.splice(result.source.index, 1);
    updatedItems.splice(result.destination.index, 0, movedItem);

    setItemsForSorting(updatedItems);
    setItemOrder(updatedItems.map((item) => item.id));
  };

  const CustomFileInput = () => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
        setNewItemImageFile(event.target.files[0]);
      }
    };

    return (
      <div>
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
            className="secondary-button"
          >
            {t("choose_image")}
          </button>
          <span className="ml-2 truncate">
            {newItemImageFile?.name
              ? newItemImageFile?.name
              : editItemImage?.split("/").pop() || t("no_file_chosen")}
          </span>
        </div>
      </div>
    );
  };

  const openSortUncategorizedItemsModal = () => {
    const uncategorizedItems = menuItems.filter((item) => !item.categoryId);
    setUncategorizedItemsForSorting(uncategorizedItems);
    setItemOrder(uncategorizedItems.map((item) => item.id));
    setIsOrderUncategorizedItemsModalOpen(true);
  };

  const handleSaveUncategorizedItemOrder = async () => {
    setIsLoading(true);
    try {
      await updateItemOrder(itemOrder);

      const updatedMenuItems = [...menuItems];
      updatedMenuItems.sort(
        (a, b) => itemOrder.indexOf(a.id) - itemOrder.indexOf(b.id)
      );
      setMenuItems(updatedMenuItems);

      setIsOrderUncategorizedItemsModalOpen(false);
      toast.success(t("uncategorized_item_order_updated"));
    } catch (error) {
      console.error("Failed to update uncategorized item order", error);
      toast.error(t("failed_to_update_uncategorized_item_order"));
    } finally {
      setIsLoading(false);
    }
  };

  const onUncategorizedItemDragEnd = (result: any) => {
    if (!result.destination) return;

    const updatedItems = Array.from(uncategorizedItemsForSorting);
    const [movedItem] = updatedItems.splice(result.source.index, 1);
    updatedItems.splice(result.destination.index, 0, movedItem);

    setUncategorizedItemsForSorting(updatedItems);
    setItemOrder(updatedItems.map((item) => item.id));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="section-title">{t("menu")}</h2>
          <h3 className="section-subtitle">
            {t("manage_your_menu_items_and_categories")}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddCategoryModalOpen(true)}
            className="primary-button"
          >
            {t("add_category")}
          </button>
          <button
            onClick={() => setAddItemModalOpen(true)}
            className="primary-button"
          >
            {t("add_menu_item")}
          </button>
          <button
            onClick={() => setIsOrderCategoriesModalOpen(true)}
            className="secondary-button"
          >
            {t("order_categories")}
          </button>
        </div>
      </div>

      <div className="h-line"></div>

      <div>
        {categories.map((category) => (
          <div key={category.id} className="my-4">
            <h4 className="text-lg font-semibold flex justify-between">
              {category.name}
              <div className="flex gap-2">
                <button
                  onClick={() => openSortItemsModal(category.id)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  {t("sort")}
                </button>
                <button
                  onClick={() => openEditCategoryModal(category)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  {t("edit")}
                </button>
                <button
                  onClick={() => handleDeleteCategoryModal(category)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  {t("delete")}
                </button>
              </div>
            </h4>
            <ul className="bg-white flex flex-col mt-2">
              {renderMenuItems(category.id)}
            </ul>
            <div className="h-line"></div>
          </div>
        ))}
        <div className="my-4">
          <h4 className="text-lg font-semibold flex justify-between">
            {t("uncategorized_items")}
            <button
              onClick={openSortUncategorizedItemsModal}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              {t("sort")}
            </button>
          </h4>
          <ul className="g-white flex flex-col mt-2">
            {renderMenuItems(null)}
          </ul>
        </div>
      </div>

      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setAddCategoryModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/category.svg"
                alt="Restaurant Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("add_category")}</h2>
                <p className="text-sm text-gray-500">
                  {t("add_category_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("category_name")}
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>

            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setAddCategoryModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button onClick={handleAddCategory} className="primary-button">
                {t("add_category")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditCategoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setEditCategoryModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/category.svg"
                alt="Restaurant Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("edit_category")}</h2>
                <p className="text-sm text-gray-500">
                  {t("edit_category_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("category_name")}
              </label>
              <input
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>

            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditCategoryModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleUpdateCategory}
                className={`primary-button ${isLoading ? "disabled" : ""}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  t("update_category")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative overflow-y-auto max-h-screen">
            <button
              onClick={() => {
                setAddItemModalOpen(false);
                setEditItemId(null);
                setEditItemName("");
                setEditItemPrice("");
                setEditItemDescription("");
                setEditItemImage(null);
                setSelectedCategoryId(null);
                setNewItemImageFile(null);
                setRemoveImage(false);
                setNewItemDescription("");
                setAllergenSearch("");
                setAllergenDropdownOpen(false);
                setSelectedAllergenIds([]);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/item.svg"
                alt="Restaurant Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("add_menu_item")}</h2>
                <p className="text-sm text-gray-500">
                  {t("add_menu_item_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("item_name")}
              </label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("item_price")}
              </label>
              <input
                type="text"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("category")}
              </label>
              <select
                value={selectedCategoryId || ""}
                onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              >
                <option value="">{t("no_category")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("allergens")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t("search_allergens")}
                  value={allergenSearch}
                  onChange={(e) => setAllergenSearch(e.target.value)}
                  onFocus={() => setAllergenDropdownOpen(true)}
                  onBlur={() => setAllergenDropdownOpen(false)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                />
                {isAllergenDropdownOpen && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-auto">
                    {allergens
                      .filter(
                        (allergen) =>
                          !selectedAllergenIds.includes(
                            allergen.id.toString()
                          ) &&
                          (language === "en"
                            ? allergen.name_en
                            : allergen.name_hr
                          )
                            .toLowerCase()
                            .includes(allergenSearch.toLowerCase())
                      )
                      .map((allergen) => (
                        <div
                          key={allergen.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={() =>
                            handleAllergenSelect(allergen.id.toString())
                          }
                        >
                          <span className="flex items-center">
                            {allergen.icon}{" "}
                            {language === "en"
                              ? allergen.name_en
                              : allergen.name_hr}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedAllergenIds.map((id) => {
                  const allergen = allergens.find(
                    (all) => all.id.toString() === id
                  );
                  return (
                    <div
                      key={id}
                      className="flex items-center px-2 py-1 rounded-full bg-gray-100"
                    >
                      <span className="mr-2">{allergen?.icon}</span>
                      <span>
                        {language === "en"
                          ? allergen?.name_en
                          : allergen?.name_hr}
                      </span>
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
            <div className="mb-4">
              <CustomFileInput />

              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={removeImage}
                    onChange={(e) => setRemoveImage(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="ml-2">{t("remove_image")}</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("description")}
              </label>
              <textarea
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>

            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setAddItemModalOpen(false);
                  handleModalClose();
                }}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleAddMenuItem}
                className={`primary-button ${isLoading ? "disabled" : ""}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  t("add_menu_item")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditItemModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative overflow-y-auto max-h-screen">
            <button
              onClick={() => {
                setEditItemModalOpen(false);
                handleModalClose();
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/item.svg"
                alt="Restaurant Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("edit_menu_item")}</h2>
                <p className="text-sm text-gray-500">
                  {t("edit_menu_item_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("item_name")}
              </label>
              <input
                type="text"
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("item_price")}
              </label>
              <input
                type="text"
                value={editItemPrice}
                onChange={(e) => setEditItemPrice(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("category")}
              </label>
              <select
                value={selectedCategoryId || ""}
                onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              >
                <option value="">{t("no_category")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("allergens")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t("search_allergens")}
                  value={allergenSearch}
                  onChange={(e) => setAllergenSearch(e.target.value)}
                  onFocus={() => setAllergenDropdownOpen(true)}
                  onBlur={() => setAllergenDropdownOpen(false)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                />
                {isAllergenDropdownOpen && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-auto">
                    {allergens
                      .filter(
                        (allergen) =>
                          !selectedAllergenIds.includes(
                            allergen.id.toString()
                          ) &&
                          (language === "en"
                            ? allergen.name_en
                            : allergen.name_hr
                          )
                            .toLowerCase()
                            .includes(allergenSearch.toLowerCase())
                      )
                      .map((allergen) => (
                        <div
                          key={allergen.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={() =>
                            handleAllergenSelect(allergen.id.toString())
                          }
                        >
                          <span className="flex items-center">
                            {allergen.icon}{" "}
                            {language === "en"
                              ? allergen.name_en
                              : allergen.name_hr}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedAllergenIds.map((id) => {
                  const allergen = allergens.find(
                    (all) => all.id.toString() === id
                  );
                  return (
                    <div
                      key={id}
                      className="flex items-center px-2 py-1 rounded-full bg-gray-100"
                    >
                      <span className="mr-2">{allergen?.icon}</span>
                      <span>
                        {language === "en"
                          ? allergen?.name_en
                          : allergen?.name_hr}
                      </span>
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

            <div className="mb-4">
              <CustomFileInput />
              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={removeImage}
                    onChange={(e) => setRemoveImage(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="ml-2">{t("remove_image")}</span>
                </label>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("description")}
              </label>
              <textarea
                value={editItemDescription}
                onChange={(e) => setEditItemDescription(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>

            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEditItemModalOpen(false);
                  handleModalClose();
                }}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleUpdateMenuItem}
                className={`primary-button ${isLoading ? "disabled" : ""}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  t("update_menu_item")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteCategoryModalOpen && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setDeleteCategoryModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/trash.svg"
                alt="Trash Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">
                  {t("delete_category")}
                </h2>
                <p className="text-sm text-gray-500">
                  {t("delete_category_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <p className="text-sm text-black">
                {t("are_you_sure_you_want_to_delete_the_category")}{" "}
                <span className="font-bold">{categoryToDelete.name}</span>?
                <br />
                {t("this_will_delete_all_items_in_the_category")}
              </p>
            </div>
            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteCategoryModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleDeleteCategory(categoryToDelete.id)}
                className="delete-button"
              >
                {t("delete_category")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteItemModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setDeleteItemModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/trash.svg"
                alt="Trash Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("delete_item")}</h2>
                <p className="text-sm text-gray-500">
                  {t("delete_item_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <p className="text-sm text-black">
                {t("are_you_sure_you_want_to_delete_the_item")}{" "}
                <span className="font-bold">{itemToDelete.name}</span>?
              </p>
            </div>
            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteItemModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleDeleteMenuItem(itemToDelete.id)}
                className="delete-button"
              >
                {t("delete_item")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isOrderCategoriesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsOrderCategoriesModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">
              {t("order_categories")}
            </h2>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="categories">
                {(provided) => {
                  return (
                    <ul
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {categoriesForSorting.map((category, index) => {
                        if (!category.id) {
                          console.error("Category ID is undefined!", category);
                          return null;
                        }
                        return (
                          <Draggable
                            key={category.id}
                            draggableId={category.id.toString()}
                            index={index}
                          >
                            {(provided) => (
                              <li
                                key={category.id}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                ref={provided.innerRef}
                                className="p-2 border border-gray-300 rounded bg-white cursor-pointer flex items-center w-full"
                              >
                                <span className="flex items-center mr-2">
                                  <img
                                    src="/images/drag.png"
                                    alt="Drag Icon"
                                    className="w-4 h-4"
                                  />
                                </span>
                                {category.name}
                              </li>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </ul>
                  );
                }}
              </Droppable>
            </DragDropContext>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setIsOrderCategoriesModalOpen(false);
                  setCategoriesForSorting(categories);
                }}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveCategoryOrder}
                className={`primary-button ${isLoading ? "disabled" : ""}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  t("save_order")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isOrderItemsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsOrderItemsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">{t("order_items")}</h2>
            <DragDropContext onDragEnd={onItemDragEnd}>
              <Droppable droppableId="items">
                {(provided) => (
                  <ul
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {itemsForSorting.map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id.toString()}
                        index={index}
                      >
                        {(provided) => (
                          <li
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            ref={provided.innerRef}
                            className="p-2 border border-gray-300 rounded bg-white cursor-pointer flex items-center w-full"
                          >
                            <span className="flex items-center mr-2">
                              <img
                                src="/images/drag.png"
                                alt="Drag Icon"
                                className="w-4 h-4"
                              />
                            </span>
                            {item.name}
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setIsOrderItemsModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveItemOrder}
                className={`primary-button ${isLoading ? "disabled" : ""}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  t("save_order")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isOrderUncategorizedItemsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsOrderUncategorizedItemsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">
              {t("order_uncategorized_items")}
            </h2>
            <DragDropContext onDragEnd={onUncategorizedItemDragEnd}>
              <Droppable droppableId="uncategorizedItems">
                {(provided) => (
                  <ul
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {uncategorizedItemsForSorting.map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id.toString()}
                        index={index}
                      >
                        {(provided) => (
                          <li
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            ref={provided.innerRef}
                            className="p-2 border border-gray-300 rounded bg-white cursor-pointer flex items-center w-full"
                          >
                            <span className="flex items-center mr-2">
                              <img
                                src="/images/drag.png"
                                alt="Drag Icon"
                                className="w-4 h-4"
                              />
                            </span>
                            {item.name}
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setIsOrderUncategorizedItemsModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveUncategorizedItemOrder}
                className={`primary-button ${isLoading ? "disabled" : ""}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  t("save_order")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuTab;

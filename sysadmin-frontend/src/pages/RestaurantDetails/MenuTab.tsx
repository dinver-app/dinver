import { useEffect, useState } from "react";
import {
  getMenuItems,
  getCategoryItems,
  createCategory,
  updateCategory,
  createMenuItem,
  updateMenuItem,
} from "../../services/menuService";
import { MenuItem, Category } from "../../interfaces/Interfaces";
import Modal from "../../components/Modal";
import { useTranslation } from "react-i18next";

const MenuTab = ({ restaurantId }: { restaurantId: string | undefined }) => {
  const { t } = useTranslation();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemPrice, setNewItemPrice] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setItemModalOpen] = useState(false);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const items: MenuItem[] = await getMenuItems(restaurantId as string);
        setMenuItems(items);
        const cats: Category[] = await getCategoryItems(restaurantId as string);
        setCategories(cats);
      } catch (error) {
        console.error("Failed to fetch menu data", error);
      }
    };

    fetchMenuData();
  }, [restaurantId]);

  useEffect(() => {
    console.log(menuItems);
  }, [menuItems]);

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    try {
      const category: Category = await createCategory({
        name: newCategoryName,
        restaurantId: restaurantId as string,
      });
      setCategories([...categories, category]);
      setNewCategoryName("");
      setCategoryModalOpen(false);
    } catch (error) {
      console.error("Failed to create category", error);
    }
  };

  const handleAddMenuItem = async () => {
    if (!newItemName || !newItemPrice) return;
    try {
      const menuItem: MenuItem = await createMenuItem({
        name: newItemName,
        price: parseFloat(newItemPrice),
        restaurantId: restaurantId as string,
        categoryId: selectedCategoryId || undefined,
      });
      setMenuItems([...menuItems, menuItem]);
      setNewItemName("");
      setNewItemPrice("");
      setSelectedCategoryId(null);
      setItemModalOpen(false);
    } catch (error) {
      console.error("Failed to create menu item", error);
    }
  };

  const handleUpdateCategory = async (id: string, name: string) => {
    try {
      const updatedCategory: Category = await updateCategory(id, { name });
      setCategories(
        categories.map((cat) => (cat.id === id ? updatedCategory : cat))
      );
    } catch (error) {
      console.error("Failed to update category", error);
    }
  };

  const handleUpdateMenuItem = async (
    id: string,
    name: string,
    price: number
  ) => {
    try {
      const updatedMenuItem: MenuItem = await updateMenuItem(id, {
        name,
        price,
      });
      setMenuItems(
        menuItems.map((item) => (item.id === id ? updatedMenuItem : item))
      );
    } catch (error) {
      console.error("Failed to update menu item", error);
    }
  };

  const renderMenuItems = (categoryId: string | null) => {
    return menuItems
      .filter((item) => item.categoryId === categoryId)
      .map((item) => (
        <li
          key={item.id}
          className="flex justify-between items-center p-2 border-b"
        >
          <span>{item.name}</span>
          <span>${item.price}</span>
        </li>
      ));
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="section-title">{t("menu")}</h2>
      <h3 className="section-subtitle">
        {t("manage_your_menu_items_and_categories")}
      </h3>

      <div className="flex gap-4">
        <button
          onClick={() => setCategoryModalOpen(true)}
          className="primary-button"
        >
          {t("add_category")}
        </button>
        <button
          onClick={() => setItemModalOpen(true)}
          className="primary-button"
        >
          {t("add_menu_item")}
        </button>
      </div>

      <div>
        {categories.map((category) => (
          <div key={category.id} className="my-4">
            <h4 className="text-lg font-semibold">{category.name}</h4>
            <ul className="bg-white rounded-lg shadow-md">
              {renderMenuItems(category.id)}
            </ul>
          </div>
        ))}
        <div className="my-4">
          <h4 className="text-lg font-semibold">{t("uncategorized_items")}</h4>
          <ul className="bg-white rounded-lg shadow-md">
            {renderMenuItems(null)}
          </ul>
        </div>
      </div>

      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
      >
        <h4 className="text-lg font-semibold mb-4">{t("add_new_category")}</h4>
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder={t("category_name")}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <button onClick={handleAddCategory} className="primary-button w-full">
          {t("add_category")}
        </button>
      </Modal>

      <Modal isOpen={isItemModalOpen} onClose={() => setItemModalOpen(false)}>
        <h4 className="text-lg font-semibold mb-4">{t("add_new_menu_item")}</h4>
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder={t("item_name")}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <input
          type="number"
          value={newItemPrice}
          onChange={(e) => setNewItemPrice(e.target.value)}
          placeholder={t("item_price")}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <select
          value={selectedCategoryId || ""}
          onChange={(e) => setSelectedCategoryId(e.target.value || null)}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        >
          <option value="">{t("no_category")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button onClick={handleAddMenuItem} className="primary-button w-full">
          {t("add_menu_item")}
        </button>
      </Modal>
    </div>
  );
};

export default MenuTab;

import { useEffect, useState } from "react";
import MenuList from "./MenuPages/MenuList";
import AddCategory from "./MenuPages/AddCategory";
import EditCategory from "./MenuPages/EditCategory";
import AddMenuItem from "./MenuPages/AddMenuItem";
import EditMenuItem from "./MenuPages/EditMenuItem";
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
import { MenuItem, Category, Allergen } from "../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

const MenuTab = ({ restaurantId }: { restaurantId: string | undefined }) => {
  const { t } = useTranslation();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [view, setView] = useState("list");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(
    null
  );

  useEffect(() => {
    const fetchData = async () => {
      const loadingToastId = toast.loading(t("loading"));

      try {
        const [items, categories, allergens] = await Promise.all([
          getMenuItems(restaurantId as string),
          getCategoryItems(restaurantId as string),
          getAllAllergens(),
        ]);

        setMenuItems(items);
        setCategories(categories);
        setAllergens(allergens);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error(t("failed_to_fetch_data"));
      } finally {
        toast.dismiss(loadingToastId);
      }
    };

    fetchData();
  }, [restaurantId, t]);

  const handleAddCategory = () => setView("addCategory");
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setView("editCategory");
  };
  const handleAddMenuItem = () => setView("addMenuItem");
  const handleEditMenuItem = (menuItem: MenuItem) => {
    setSelectedMenuItem(menuItem);
    setView("editMenuItem");
  };
  const handleCancel = () => setView("list");

  const handleSaveCategory = async (name: string) => {
    try {
      const category = await createCategory({
        name,
        restaurantId: restaurantId as string,
      });
      setCategories([...categories, category]);
      toast.success(t("category_created"));
    } catch (error) {
      console.error("Failed to create category", error);
      toast.error(t("failed_to_create_category"));
    } finally {
      handleCancel();
    }
  };

  const handleUpdateCategory = async (id: string, name: string) => {
    try {
      const updatedCategory = await updateCategory(id, { name });
      setCategories(
        categories.map((cat) => (cat.id === id ? updatedCategory : cat))
      );
      toast.success(t("category_updated"));
    } catch (error) {
      console.error("Failed to update category", error);
      toast.error(t("failed_to_update_category"));
    } finally {
      handleCancel();
    }
  };

  const handleSaveMenuItem = async (
    name: string,
    price: string,
    description: string,
    imageFile: File | null,
    selectedAllergenIds: string[]
  ) => {
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("price", price);
      formData.append("description", description);
      formData.append("restaurantId", restaurantId as string);
      if (imageFile) {
        formData.append("imageFile", imageFile);
      }
      selectedAllergenIds.forEach((id) => {
        formData.append("allergenIds", id);
      });

      const menuItem = await createMenuItem(formData);
      setMenuItems([...menuItems, menuItem]);
      toast.success(t("menu_item_created"));
    } catch (error) {
      console.error("Failed to create menu item", error);
      toast.error(t("failed_to_create_menu_item"));
    } finally {
      handleCancel();
    }
  };

  const handleUpdateMenuItem = async (
    id: string,
    name: string,
    price: string,
    description: string,
    imageFile: File | null,
    selectedAllergenIds: string[]
  ) => {
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("price", price);
      formData.append("description", description);
      if (imageFile) {
        formData.append("imageFile", imageFile);
      }
      selectedAllergenIds.forEach((id) => {
        formData.append("allergenIds", id);
      });

      const updatedMenuItem = await updateMenuItem(id, formData);
      setMenuItems(
        menuItems.map((item) => (item.id === id ? updatedMenuItem : item))
      );
      toast.success(t("menu_item_updated"));
    } catch (error) {
      console.error("Failed to update menu item", error);
      toast.error(t("failed_to_update_menu_item"));
    } finally {
      handleCancel();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories(categories.filter((cat) => cat.id !== id));
      toast.success(t("category_deleted"));
    } catch (error) {
      console.error("Failed to delete category", error);
      toast.error(t("failed_to_delete_category"));
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    try {
      await deleteMenuItem(id);
      setMenuItems(menuItems.filter((item) => item.id !== id));
      toast.success(t("menu_item_deleted"));
    } catch (error) {
      console.error("Failed to delete menu item", error);
      toast.error(t("failed_to_delete_menu_item"));
    }
  };

  const handleSortCategories = async (categoryOrder: string[]) => {
    try {
      await updateCategoryOrder(categoryOrder);
      setCategories((prevCategories) =>
        categoryOrder.map((id) => prevCategories.find((cat) => cat.id === id)!)
      );
      toast.success(t("category_order_updated"));
    } catch (error) {
      console.error("Failed to update category order", error);
      toast.error(t("failed_to_update_category_order"));
    }
  };

  const handleSortItems = async (categoryId: string, itemOrder: string[]) => {
    try {
      await updateItemOrder(itemOrder);
      setMenuItems((prevItems) => {
        const itemsInCategory = prevItems.filter(
          (item) => item.categoryId === categoryId
        );
        const sortedItems = itemOrder.map(
          (id) => itemsInCategory.find((item) => item.id === id)!
        );
        const otherItems = prevItems.filter(
          (item) => item.categoryId !== categoryId
        );
        return [...otherItems, ...sortedItems];
      });
      toast.success(t("item_order_updated"));
    } catch (error) {
      console.error("Failed to update item order", error);
      toast.error(t("failed_to_update_item_order"));
    }
  };

  const renderView = () => {
    switch (view) {
      case "addCategory":
        return (
          <AddCategory onCancel={handleCancel} onSave={handleSaveCategory} />
        );
      case "editCategory":
        return (
          <EditCategory
            category={selectedCategory as Category}
            onCancel={handleCancel}
            onSave={handleUpdateCategory}
          />
        );
      case "addMenuItem":
        return (
          <AddMenuItem
            onCancel={handleCancel}
            onSave={handleSaveMenuItem}
            allergens={allergens}
          />
        );
      case "editMenuItem":
        return (
          <EditMenuItem
            menuItem={selectedMenuItem as MenuItem}
            onCancel={handleCancel}
            onSave={handleUpdateMenuItem}
            allergens={allergens}
          />
        );
      default:
        return (
          <MenuList
            categories={categories}
            menuItems={menuItems}
            allergens={allergens}
            onAddCategory={handleAddCategory}
            onAddMenuItem={handleAddMenuItem}
            onEditCategory={handleEditCategory}
            onEditMenuItem={handleEditMenuItem}
            onDeleteCategory={handleDeleteCategory}
            onDeleteMenuItem={handleDeleteMenuItem}
            onSortCategories={handleSortCategories}
            onSortItems={handleSortItems}
          />
        );
    }
  };

  return <div>{renderView()}</div>;
};

export default MenuTab;

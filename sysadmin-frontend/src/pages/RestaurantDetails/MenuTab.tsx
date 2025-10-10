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
import {
  MenuItem,
  Category,
  Allergen,
  Translation,
  Language,
} from "../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { VIEWS, ViewType } from "../../constants/menuConstants";
import { MenuErrorBoundary } from "../../components/ErrorBoundary";

const MenuTab = ({ restaurantId }: { restaurantId: string | undefined }) => {
  const { t } = useTranslation();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [view, setView] = useState<ViewType>(VIEWS.LIST);
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

  const handleAddCategory = () => setView(VIEWS.ADD_CATEGORY);
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setView(VIEWS.EDIT_CATEGORY);
  };
  const handleAddMenuItem = (categoryId?: string) => {
    setView(VIEWS.ADD_MENU_ITEM);
    setSelectedCategory(categoryId ? ({ id: categoryId } as Category) : null);
  };
  const handleEditMenuItem = (menuItem: MenuItem) => {
    setSelectedMenuItem(menuItem);
    setView(VIEWS.EDIT_MENU_ITEM);
  };
  const handleCancel = () => setView(VIEWS.LIST);

  const handleSaveCategory = async (data: {
    translates: { name: string; language: string }[];
    isActive: boolean;
  }) => {
    try {
      const category = await createCategory({
        translations: data.translates.map((translate) => ({
          name: translate.name,
          language: translate.language as Language,
        })),
        restaurantId: restaurantId as string,
        isActive: data.isActive,
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

  const handleUpdateCategory = async (
    id: string,
    data: { translations: Translation[]; isActive: boolean }
  ) => {
    try {
      await updateCategory(id, data);

      const freshCategories = await getCategoryItems(restaurantId as string);
      setCategories(freshCategories);

      toast.success(t("category_updated"));
    } catch (error) {
      console.error("Failed to update category", error);
      toast.error(t("failed_to_update_category"));
    } finally {
      handleCancel();
    }
  };

  const handleSaveMenuItem = async (data: {
    translates: {
      name: string;
      description: string;
      language: string;
    }[];
    price: string;
    minPrice?: string;
    maxPrice?: string;
    allergens: string[];
    categoryId?: string | null;
    imageFile?: File;
    isActive: boolean;
    defaultSizeIndex?: number;
    sizes?: {
      sizeId: string;
      price: number;
    }[];
  }) => {
    try {
      const menuItem = await createMenuItem({
        translations: data.translates.map((t) => ({
          ...t,
          language: t.language as Language,
        })),
        price: data.price,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        restaurantId: restaurantId as string,
        allergenIds: data.allergens,
        categoryId: data.categoryId,
        imageFile: data.imageFile,
        isActive: data.isActive,
        defaultSizeIndex: data.defaultSizeIndex,
        sizes: data.sizes,
      });

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
    data: {
      translations: {
        name: string;
        description: string;
        language: string;
      }[];
      price: string;
      minPrice?: string;
      maxPrice?: string;
      allergens: string[];
      imageFile: File | null;
      removeImage: boolean;
      categoryId?: string | null;
      isActive: boolean;
      defaultSizeIndex?: number;
      sizes?: {
        sizeId: string;
        price: number;
      }[];
    }
  ) => {
    try {
      const updatedMenuItem = await updateMenuItem(id, {
        translations: data.translations.map((t) => ({
          ...t,
          language: t.language as Language,
        })),
        price: data.price,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        restaurantId: restaurantId as string,
        allergenIds: data.allergens,
        imageFile: data.imageFile || undefined,
        removeImage: data.removeImage,
        categoryId: data.categoryId,
        isActive: data.isActive,
        defaultSizeIndex: data.defaultSizeIndex,
        sizes: data.sizes,
      });

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

  const handleSortItems = async (
    categoryId: string | null,
    itemOrder: string[]
  ) => {
    try {
      await updateItemOrder(itemOrder);
      setMenuItems((prevItems) => {
        const itemsInCategory = prevItems.filter((item) =>
          categoryId ? item.categoryId === categoryId : !item.categoryId
        );
        const sortedItems = itemOrder.map(
          (id) => itemsInCategory.find((item) => item.id === id)!
        );
        const otherItems = prevItems.filter((item) =>
          categoryId ? item.categoryId !== categoryId : item.categoryId
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
      case VIEWS.ADD_CATEGORY:
        return (
          <AddCategory onCancel={handleCancel} onSave={handleSaveCategory} />
        );
      case VIEWS.EDIT_CATEGORY:
        return (
          <EditCategory
            category={selectedCategory as Category}
            onCancel={handleCancel}
            onSave={handleUpdateCategory}
          />
        );
      case VIEWS.ADD_MENU_ITEM:
        return (
          <AddMenuItem
            restaurantId={restaurantId as string}
            onCancel={handleCancel}
            onSave={handleSaveMenuItem}
            allergens={allergens}
            categories={categories}
            initialCategoryId={selectedCategory?.id}
          />
        );
      case VIEWS.EDIT_MENU_ITEM:
        return (
          <EditMenuItem
            menuItem={selectedMenuItem as MenuItem}
            restaurantId={restaurantId as string}
            onCancel={handleCancel}
            onSave={handleUpdateMenuItem}
            allergens={allergens}
            categories={categories}
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

  return (
    <MenuErrorBoundary>
      <div>{renderView()}</div>
    </MenuErrorBoundary>
  );
};

export default MenuTab;

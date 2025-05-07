import { useEffect, useState } from "react";
import {
  getDrinkItems,
  getDrinkCategories,
  createDrinkCategory,
  updateDrinkCategory,
  createDrinkItem,
  updateDrinkItem,
  deleteDrinkCategory,
  deleteDrinkItem,
  updateDrinkCategoryOrder,
  updateDrinkItemOrder,
} from "../../services/drinkService";
import { DrinkItem, Category, Translation } from "../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { Language } from "../../interfaces/Interfaces";
import { VIEWS, ViewType } from "../../constants/menuConstants";
import AddDrinkCategory from "./DrinkPages/AddCategory";
import EditDrinkCategory from "./DrinkPages/EditCategory";
import AddDrinkItem from "./DrinkPages/AddDrinkItem";
import EditDrinkItem from "./DrinkPages/EditDrinkItem";
import DrinksList from "./DrinkPages/DrinksList";

const DrinkTab = ({ restaurantId }: { restaurantId: string | undefined }) => {
  const { t } = useTranslation();
  const [drinkItems, setDrinkItems] = useState<DrinkItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [view, setView] = useState<ViewType>(VIEWS.LIST);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedDrinkItem, setSelectedDrinkItem] = useState<DrinkItem | null>(
    null
  );

  useEffect(() => {
    const fetchData = async () => {
      const loadingToastId = toast.loading(t("loading"));
      try {
        const [items, categories] = await Promise.all([
          getDrinkItems(restaurantId as string),
          getDrinkCategories(restaurantId as string),
        ]);
        setDrinkItems(items);
        setCategories(categories);
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
  const handleAddDrinkItem = (categoryId?: string) => {
    setView(VIEWS.ADD_MENU_ITEM);
    setSelectedCategory(categoryId ? ({ id: categoryId } as Category) : null);
  };
  const handleEditDrinkItem = (drinkItem: DrinkItem) => {
    setSelectedDrinkItem(drinkItem);
    setView(VIEWS.EDIT_MENU_ITEM);
  };
  const handleCancel = () => setView(VIEWS.LIST);

  const handleSaveCategory = async (data: {
    translates: { name: string; language: string }[];
  }) => {
    try {
      const category = await createDrinkCategory({
        translations: data.translates.map((translate) => ({
          name: translate.name,
          language: translate.language as Language,
        })),
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

  const handleUpdateCategory = async (
    id: string,
    data: { translations: Translation[] }
  ) => {
    try {
      await updateDrinkCategory(id, data);
      const freshCategories = await getDrinkCategories(restaurantId as string);
      setCategories(freshCategories);
      toast.success(t("category_updated"));
    } catch (error) {
      console.error("Failed to update category", error);
      toast.error(t("failed_to_update_category"));
    } finally {
      handleCancel();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDrinkCategory(id);
      setCategories(categories.filter((cat) => cat.id !== id));
      toast.success(t("category_deleted"));
    } catch (error) {
      console.error("Failed to delete category", error);
      toast.error(t("failed_to_delete_category"));
    }
  };

  const handleDeleteDrinkItem = async (id: string) => {
    try {
      await deleteDrinkItem(id);
      setDrinkItems(drinkItems.filter((item) => item.id !== id));
      toast.success(t("drink_item_deleted"));
    } catch (error) {
      console.error("Failed to delete drink item", error);
      toast.error(t("failed_to_delete_drink_item"));
    }
  };

  const handleSortCategories = async (categoryOrder: string[]) => {
    try {
      await updateDrinkCategoryOrder(categoryOrder);
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
      await updateDrinkItemOrder(itemOrder);
      setDrinkItems((prevItems) => {
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

  const handleSaveDrinkItem = async (data: {
    translates: { name: string; description: string; language: string }[];
    price: string;
    categoryId?: string | null;
    imageFile?: File;
  }) => {
    try {
      const drinkItem = await createDrinkItem({
        translations: data.translates.map((t) => ({
          name: t.name,
          description: t.description,
          language: t.language as Language,
        })),
        price: data.price,
        restaurantId: restaurantId as string,
        categoryId: data.categoryId,
        imageFile: data.imageFile,
      });
      setDrinkItems([...drinkItems, drinkItem]);
      toast.success(t("drink_item_created"));
    } catch (error) {
      console.error("Failed to create drink item", error);
      toast.error(t("failed_to_create_drink_item"));
    } finally {
      handleCancel();
    }
  };

  const handleUpdateDrinkItem = async (
    id: string,
    data: {
      translations: { name: string; description: string; language: string }[];
      price: string;
      categoryId?: string | null;
      imageFile: File | null;
      removeImage: boolean;
    }
  ) => {
    try {
      const updatedDrinkItem = await updateDrinkItem(id, {
        translations: data.translations.map((t) => ({
          ...t,
          language: t.language as Language,
        })),
        price: data.price,
        restaurantId: restaurantId as string,
        categoryId: data.categoryId,
        imageFile: data.imageFile || undefined,
        removeImage: data.removeImage,
      });
      setDrinkItems((prevItems) =>
        prevItems.map((item) => (item.id === id ? updatedDrinkItem : item))
      );
      toast.success(t("drink_item_updated"));
    } catch (error) {
      console.error("Failed to update drink item", error);
      toast.error(t("failed_to_update_drink_item"));
    } finally {
      handleCancel();
    }
  };

  const renderView = () => {
    switch (view) {
      case VIEWS.ADD_CATEGORY:
        return (
          <AddDrinkCategory
            onCancel={handleCancel}
            onSave={handleSaveCategory}
          />
        );
      case VIEWS.EDIT_CATEGORY:
        return (
          <EditDrinkCategory
            category={selectedCategory as Category}
            onCancel={handleCancel}
            onSave={handleUpdateCategory}
          />
        );
      case VIEWS.ADD_MENU_ITEM:
        return (
          <AddDrinkItem
            onCancel={handleCancel}
            onSave={handleSaveDrinkItem}
            categories={categories}
            initialCategoryId={selectedCategory?.id}
          />
        );
      case VIEWS.EDIT_MENU_ITEM:
        return (
          <EditDrinkItem
            drinkItem={selectedDrinkItem as DrinkItem}
            onCancel={handleCancel}
            onSave={handleUpdateDrinkItem}
            categories={categories}
          />
        );
      default:
        return (
          <DrinksList
            categories={categories}
            drinkItems={drinkItems}
            onAddCategory={handleAddCategory}
            onAddDrinkItem={handleAddDrinkItem}
            onEditCategory={handleEditCategory}
            onEditDrinkItem={handleEditDrinkItem}
            onDeleteCategory={handleDeleteCategory}
            onDeleteDrinkItem={handleDeleteDrinkItem}
            onSortCategories={handleSortCategories}
            onSortItems={handleSortItems}
          />
        );
    }
  };

  return <div>{renderView()}</div>;
};

export default DrinkTab;

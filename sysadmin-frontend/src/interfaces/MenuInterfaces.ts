import { Category, MenuItem, Allergen } from "./Interfaces";

export interface MenuListProps {
  categories: Category[];
  menuItems: MenuItem[];
  allergens: Allergen[];
  onAddCategory: () => void;
  onAddMenuItem: () => void;
  onEditCategory: (
    category: Category,
    onSuccess?: (updatedCategory: Category) => void
  ) => void;
  onEditMenuItem: (menuItem: MenuItem) => void;
  onDeleteCategory: (id: string) => void;
  onDeleteMenuItem: (id: string) => void;
  onSortCategories: (categoryOrder: string[]) => void;
  onSortItems: (categoryId: string, itemOrder: string[]) => void;
  onCategoriesUpdate?: (updatedCategories: Category[]) => void;
}

export interface CategoryFormData {
  translates: { name: string; language: string }[];
}

import React, { useState, memo } from "react";
import { MenuItem, Category, Allergen } from "../../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { OrderCategoriesModal } from "../../../components/modals/OrderCategoriesModal";

interface MenuListProps {
  categories: Category[];
  menuItems: MenuItem[];
  allergens: Allergen[];
  onAddCategory: () => void;
  onAddMenuItem: (categoryId?: string) => void;
  onEditCategory: (
    category: Category,
    onSuccess?: (updatedCategory: Category) => void
  ) => void;
  onEditMenuItem: (menuItem: MenuItem) => void;
  onDeleteCategory: (id: string) => void;
  onDeleteMenuItem: (id: string) => void;
  onSortCategories: (categoryOrder: string[]) => void;
  onSortItems: (categoryId: string | null, itemOrder: string[]) => void;
  onCategoriesUpdate?: (updatedCategories: Category[]) => void;
}

const MenuList: React.FC<MenuListProps> = memo(
  ({
    categories,
    menuItems,
    allergens,
    onAddCategory,
    onAddMenuItem,
    onEditCategory,
    onEditMenuItem,
    onDeleteCategory,
    onDeleteMenuItem,
    onSortCategories,
    onSortItems,
    onCategoriesUpdate,
  }) => {
    const { t, i18n } = useTranslation();
    const [isOrderCategoriesModalOpen, setIsOrderCategoriesModalOpen] =
      useState(false);
    const [isOrderItemsModalOpen, setIsOrderItemsModalOpen] = useState(false);
    const [itemsForSorting, setItemsForSorting] = useState<MenuItem[]>([]);
    const [itemOrder, setItemOrder] = useState<string[]>([]);
    const [isDeleteCategoryModalOpen, setDeleteCategoryModalOpen] =
      useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
      null
    );
    const [isDeleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

    const openSortItemsModal = (categoryId: string | null) => {
      const itemsInCategory = menuItems.filter((item) =>
        categoryId ? item.categoryId === categoryId : !item.categoryId
      );
      setItemsForSorting(itemsInCategory);
      setItemOrder(itemsInCategory.map((item) => item.id));
      setIsOrderItemsModalOpen(true);
    };

    const handleSaveItemOrder = () => {
      const categoryId = itemsForSorting[0]?.categoryId || null;
      onSortItems(categoryId || "", itemOrder);
      setIsOrderItemsModalOpen(false);
    };

    const onItemDragEnd = (result: any) => {
      if (!result.destination) return;

      const updatedItems = Array.from(itemsForSorting);
      const [movedItem] = updatedItems.splice(result.source.index, 1);
      updatedItems.splice(result.destination.index, 0, movedItem);

      setItemsForSorting(updatedItems);
      setItemOrder(updatedItems.map((item) => item.id));
    };

    const handleEditCategory = (category: Category) => {
      const categoryWithExplicitDescription = {
        ...category,
        translations: category.translations.map((t) => ({
          ...t,
          description: t.description || "",
        })),
      };

      onEditCategory(categoryWithExplicitDescription, (updatedCategory) => {
        const updatedCategories = categories.map((cat) =>
          cat.id === updatedCategory.id ? updatedCategory : cat
        );
        onCategoriesUpdate?.(updatedCategories);
      });
    };

    const handleDeleteCategoryModal = (category: Category) => {
      setCategoryToDelete(category);
      setDeleteCategoryModalOpen(true);
    };

    const handleDeleteItemModal = (item: MenuItem) => {
      setItemToDelete(item);
      setDeleteItemModalOpen(true);
    };

    return (
      <div className="flex flex-col">
        {/* Header with title and actions */}
        <div className="border-b border-gray-200 pb-5 mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{t("menu")}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {t("manage_your_menu_items_and_categories")}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onAddCategory}
              className="primary-button px-3 py-1.5"
            >
              {t("add_category")}
            </button>
            <button
              onClick={() => onAddMenuItem(undefined)}
              className="primary-button px-3 py-1.5"
            >
              {t("add_menu_item")}
            </button>
            <button
              onClick={() => setIsOrderCategoriesModalOpen(true)}
              className="secondary-button px-3 py-1.5"
            >
              {t("order_categories")}
            </button>
          </div>
        </div>

        {/* Categories and menu items */}
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category.id} className="border-b border-gray-200 pb-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    {category.translations.find(
                      (t) => t.language === i18n.language
                    )?.name || category.name}
                    {category.translations.find(
                      (t) => t.language === i18n.language
                    )?.description && (
                      <span className="ml-2 text-sm text-gray-500 font-normal">
                        —{" "}
                        {
                          category.translations.find(
                            (t) => t.language === i18n.language
                          )?.description
                        }
                      </span>
                    )}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openSortItemsModal(category.id)}
                      className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded-md hover:bg-gray-100"
                    >
                      {t("sort")}
                    </button>
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded-md hover:bg-gray-100"
                    >
                      {t("edit")}
                    </button>
                    <button
                      onClick={() => handleDeleteCategoryModal(category)}
                      className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded-md hover:bg-red-50"
                    >
                      {t("delete")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Menu items in this category */}
              <div className="grid grid-cols-1 gap-4">
                {menuItems
                  .filter((item) => item.categoryId === category.id)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-4 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 group"
                    >
                      <div className="flex items-start space-x-4">
                        {item.imageUrl ? (
                          <div className="w-32 h-20 rounded-md overflow-hidden flex-shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-20 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg
                              className="h-10 w-10 text-gray-400"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}

                        <div className="flex-1 flex flex-col justify-center h-full">
                          <h4 className="font-semibold text-gray-900 text-lg mb-0.5 group-hover:text-green-700 transition-colors duration-200">
                            {item.translations.find(
                              (t) => t.language === i18n.language
                            )?.name || item.name}
                          </h4>
                          {item.translations.find(
                            (t) => t.language === i18n.language
                          )?.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {
                                item.translations.find(
                                  (t) => t.language === i18n.language
                                )?.description
                              }
                            </p>
                          )}
                          <div className="flex items-center space-x-6 mt-0.5">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-sm rounded font-semibold shadow-sm border border-gray-200">
                              {item.price.toString().replace(".", ",")} €
                            </span>
                            {item.allergens && item.allergens.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500 font-medium">
                                  {t("allergens")}:
                                </span>
                                {item.allergens.map((allergenId) => {
                                  const allergen = allergens.find(
                                    (a) => a.id === Number(allergenId)
                                  );
                                  return (
                                    allergen && (
                                      <span
                                        key={allergen.id}
                                        className="tooltip cursor-default text-lg"
                                        title={allergen.nameEn}
                                      >
                                        {allergen.icon}
                                      </span>
                                    )
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4 items-center self-center h-full">
                        <button
                          onClick={() => onEditMenuItem(item)}
                          className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50"
                        >
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => handleDeleteItemModal(item)}
                          className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded-md font-medium hover:bg-red-50"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </div>
                  ))}

                {menuItems.filter((item) => item.categoryId === category.id)
                  .length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">
                      {t("no_items_in_category") || "No items in category"}
                    </p>
                    <button
                      onClick={() => onAddMenuItem(category.id)}
                      className="mt-3 primary-button text-xs"
                    >
                      {t("add_menu_item")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Uncategorized items section */}
          {(menuItems.filter((item) => !item.categoryId).length > 0 ||
            categories.length === 0) && (
            <div className="border-b border-gray-200 pb-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-800">
                    {t("uncategorized_items")}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openSortItemsModal(null)}
                      className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded-md hover:bg-gray-100"
                    >
                      {t("sort")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Uncategorized menu items */}
              <div className="grid grid-cols-1 gap-4">
                {menuItems
                  .filter((item) => !item.categoryId)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-4 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 group"
                    >
                      <div className="flex items-start space-x-4">
                        {item.imageUrl ? (
                          <div className="w-32 h-20 rounded-md overflow-hidden flex-shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-20 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg
                              className="h-10 w-10 text-gray-400"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}

                        <div className="flex-1 flex flex-col justify-center h-full">
                          <h4 className="font-semibold text-gray-900 text-lg mb-0.5 group-hover:text-green-700 transition-colors duration-200">
                            {item.translations.find(
                              (t) => t.language === i18n.language
                            )?.name || item.name}
                          </h4>
                          {item.translations.find(
                            (t) => t.language === i18n.language
                          )?.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {
                                item.translations.find(
                                  (t) => t.language === i18n.language
                                )?.description
                              }
                            </p>
                          )}
                          <div className="flex items-center space-x-6 mt-0.5">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-sm rounded font-semibold shadow-sm border border-gray-200">
                              {item.price.toString().replace(".", ",")} €
                            </span>
                            {item.allergens && item.allergens.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500 font-medium">
                                  {t("allergens")}:
                                </span>
                                {item.allergens.map((allergenId) => {
                                  const allergen = allergens.find(
                                    (a) => a.id === Number(allergenId)
                                  );
                                  return (
                                    allergen && (
                                      <span
                                        key={allergen.id}
                                        className="tooltip cursor-default text-lg"
                                        title={allergen.nameEn}
                                      >
                                        {allergen.icon}
                                      </span>
                                    )
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4 items-center self-center h-full">
                        <button
                          onClick={() => onEditMenuItem(item)}
                          className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50"
                        >
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => handleDeleteItemModal(item)}
                          className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded-md font-medium hover:bg-red-50"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </div>
                  ))}

                {menuItems.filter((item) => !item.categoryId).length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">
                      {t("no_uncategorized_items")}
                    </p>
                    <button
                      onClick={() => onAddMenuItem(undefined)}
                      className="mt-3 primary-button text-xs"
                    >
                      {t("add_menu_item")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state - no categories */}
          {categories.length === 0 && menuItems.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t("no_menu_items")}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {t("get_started_by_adding_categories_or_items")}
              </p>
              <div className="mt-6 flex justify-center space-x-4">
                <button onClick={onAddCategory} className="primary-button">
                  {t("add_category")}
                </button>
                <button
                  onClick={() => onAddMenuItem(undefined)}
                  className="primary-button ml-2"
                >
                  {t("add_menu_item")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <OrderCategoriesModal
          isOpen={isOrderCategoriesModalOpen}
          onClose={() => setIsOrderCategoriesModalOpen(false)}
          categories={categories}
          onSave={onSortCategories}
        />

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
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSaveItemOrder}
                  className="px-4 py-2 bg-green-700 text-white rounded-md text-sm font-medium hover:bg-green-800"
                >
                  {t("save_order")}
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => {
                    onDeleteCategory(categoryToDelete.id);
                    setDeleteCategoryModalOpen(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => {
                    onDeleteMenuItem(itemToDelete.id);
                    setDeleteItemModalOpen(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                >
                  {t("delete_item")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default MenuList;

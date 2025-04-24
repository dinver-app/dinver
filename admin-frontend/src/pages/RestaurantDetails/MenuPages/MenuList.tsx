import React, { useState, memo } from "react";
import { MenuItem, Category, Allergen } from "../../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { OrderCategoriesModal } from "../../../components/OrderCategoriesModal";

interface MenuListProps {
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
    const { t } = useTranslation();
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
      onEditCategory(category, (updatedCategory) => {
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
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="section-title">{t("menu")}</h2>
            <h3 className="section-subtitle">
              {t("manage_your_menu_items_and_categories")}
            </h3>
          </div>
          <div className="flex gap-2">
            <button onClick={onAddCategory} className="primary-button">
              {t("add_category")}
            </button>
            <button onClick={onAddMenuItem} className="primary-button">
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
                    onClick={() => handleEditCategory(category)}
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
                {menuItems
                  .filter((item) => item.categoryId === category.id)
                  .map((item) => (
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
                          <h3 className="text-xl font-bold text-gray-800">
                            {item.name}
                          </h3>
                          <p className="text-gray-600 text-lg">
                            {item.price.toString().replace(".", ",")} €
                          </p>
                          <p className="text-sm text-gray-700 mt-2">
                            {item.description}
                          </p>
                          <div className="flex space-x-4 mt-3">
                            <div className="flex items-center space-x-2">
                              {item.allergens && item.allergens.length > 0 && (
                                <span className="font-semibold text-gray-800">
                                  {t("allergens")}:
                                </span>
                              )}
                              {item.allergens?.map((allergenId) => {
                                const allergen = allergens.find(
                                  (a) => a.id === Number(allergenId)
                                );
                                return (
                                  allergen && (
                                    <span
                                      key={allergen.id}
                                      className="tooltip cursor-default"
                                      title={allergen.nameEn}
                                    >
                                      {allergen.icon}
                                    </span>
                                  )
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-2 mt-4 md:mt-0 flex space-x-4">
                        <button
                          onClick={() => onEditMenuItem(item)}
                          className="secondary-button text-xs"
                        >
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => handleDeleteItemModal(item)}
                          className="delete-button text-xs"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
              <div className="h-line"></div>
            </div>
          ))}

          {(menuItems.filter((item) => !item.categoryId).length > 0 ||
            categories.length === 0) && (
            <div className="my-4">
              <h4 className="text-lg font-semibold flex justify-between">
                {t("uncategorized_items")}
                <div className="flex gap-2">
                  <button
                    onClick={() => openSortItemsModal(null)}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    {t("sort")}
                  </button>
                </div>
              </h4>
              <ul className="bg-white flex flex-col mt-2">
                {menuItems
                  .filter((item) => !item.categoryId)
                  .map((item) => (
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
                          <h3 className="text-xl font-bold text-gray-800">
                            {item.name}
                          </h3>
                          <p className="text-gray-600 text-lg">
                            {item.price.toString().replace(".", ",")} €
                          </p>
                          <p className="text-sm text-gray-700 mt-2">
                            {item.description}
                          </p>
                          <div className="flex space-x-4 mt-3">
                            <div className="flex items-center space-x-2">
                              {item.allergens && item.allergens.length > 0 && (
                                <span className="font-semibold text-gray-800">
                                  {t("allergens")}:
                                </span>
                              )}
                              {item.allergens?.map((allergenId) => {
                                const allergen = allergens.find(
                                  (a) => a.id === Number(allergenId)
                                );
                                return (
                                  allergen && (
                                    <span
                                      key={allergen.id}
                                      className="tooltip cursor-default"
                                      title={allergen.nameEn}
                                    >
                                      {allergen.icon}
                                    </span>
                                  )
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-2 mt-4 md:mt-0 flex space-x-4">
                        <button
                          onClick={() => onEditMenuItem(item)}
                          className="secondary-button text-xs"
                        >
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => handleDeleteItemModal(item)}
                          className="delete-button text-xs"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
              <div className="h-line"></div>
            </div>
          )}
        </div>

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
                  className="secondary-button"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSaveItemOrder}
                  className="primary-button"
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
                  className="secondary-button"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => {
                    onDeleteCategory(categoryToDelete.id);
                    setDeleteCategoryModalOpen(false);
                  }}
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
                  onClick={() => {
                    onDeleteMenuItem(itemToDelete.id);
                    setDeleteItemModalOpen(false);
                  }}
                  className="delete-button"
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

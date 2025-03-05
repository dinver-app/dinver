import React, { useState, useEffect } from "react";
import { Category } from "../interfaces/Interfaces";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useTranslation } from "react-i18next";

interface OrderCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (order: string[]) => void;
}

export const OrderCategoriesModal: React.FC<OrderCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSave,
}) => {
  const { t } = useTranslation();
  const [localCategoryOrder, setLocalCategoryOrder] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLocalCategoryOrder(categories.map((cat) => cat.id));
    }
  }, [isOpen, categories]);

  const onCategoryDragEnd = (result: any) => {
    if (!result.destination) return;

    const updatedCategoryOrder = Array.from(localCategoryOrder);
    const [movedCategoryId] = updatedCategoryOrder.splice(
      result.source.index,
      1
    );
    updatedCategoryOrder.splice(result.destination.index, 0, movedCategoryId);

    setLocalCategoryOrder(updatedCategoryOrder);
  };

  const handleSave = () => {
    onSave(localCategoryOrder);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          &times;
        </button>
        <h2 className="text-lg font-semibold mb-4">{t("order_categories")}</h2>
        <DragDropContext onDragEnd={onCategoryDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {localCategoryOrder.map((categoryId, index) => {
                  const category = categories.find(
                    (cat) => cat.id === categoryId
                  );
                  return (
                    category && (
                      <Draggable
                        key={category.id}
                        draggableId={category.id}
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
                            {category.name}
                          </li>
                        )}
                      </Draggable>
                    )
                  );
                })}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>

        <div className="flex justify-end space-x-3 mt-4">
          <button onClick={onClose} className="secondary-button">
            {t("cancel")}
          </button>
          <button onClick={handleSave} className="primary-button">
            {t("save_order")}
          </button>
        </div>
      </div>
    </div>
  );
};

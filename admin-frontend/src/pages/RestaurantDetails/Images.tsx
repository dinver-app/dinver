import React, { useState, useRef } from "react";
import {
  addRestaurantImages,
  deleteRestaurantImage,
  updateImageOrder,
} from "../../services/restaurantService";
import toast from "react-hot-toast";
import { Restaurant } from "../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

type RestaurantImage = { url: string; imageUrls: { thumbnail: string; medium: string; fullscreen: string } };

const Images = ({
  restaurant,
  onUpdate,
}: {
  restaurant: Restaurant;
  onUpdate: (updatedRestaurant: Restaurant) => void;
}) => {
  const { t } = useTranslation();
  const [images, setImages] = useState<RestaurantImage[]>(restaurant.images || []);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reorderedImages, setReorderedImages] = useState<RestaurantImage[]>(
    restaurant.images || []
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDeleteImageModalOpen, setIsDeleteImageModalOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!restaurant.id) {
      toast.error(t("restaurant_id_is_required"));
      return;
    }
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);

      // Limit to maximum 10 images at once
      if (selectedFiles.length > 10) {
        toast.error(t("max_10_images_allowed"));
        // Reset the input
        event.target.value = "";
        return;
      }

      const toastId = toast.loading(t("uploading_images"));
      try {
        const data = await addRestaurantImages(
          restaurant.id,
          restaurant.slug || "",
          selectedFiles
        );
        setImages(data.images);
        setReorderedImages(data.images);
        onUpdate({ ...restaurant, images: data.images });
        toast.success(t("images_uploaded_successfully"), { id: toastId });
        // Reset the input after successful upload
        event.target.value = "";
      } catch (error) {
        console.error("Failed to upload images", error);
        toast.error(t("failed_to_upload_images"), { id: toastId });
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteImageConfirmation = (image: RestaurantImage) => {
    setImageToDelete(image.url);
    setIsDeleteImageModalOpen(true);
  };

  const confirmDeleteImage = async () => {
    if (!imageToDelete || !restaurant.id) return;

    const toastId = toast.loading(t("deleting_image"));
    try {
      const data = await deleteRestaurantImage(
        restaurant.id,
        restaurant.slug || "",
        imageToDelete
      );
      setImages(data.images);
      setReorderedImages(data.images);
      onUpdate({ ...restaurant, images: data.images });
      toast.success(t("image_deleted_successfully"), { id: toastId });
    } catch (error) {
      console.error("Failed to delete image", error);
      toast.error(t("failed_to_delete_image"), { id: toastId });
    } finally {
      setIsDeleteImageModalOpen(false);
      setImageToDelete(null);
    }
  };

  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setIsGalleryOpen(true);
  };

  const closeGallery = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsGalleryOpen(false);
    }
  };

  const handleSaveImageOrder = async () => {
    try {
      // Send URLs to the backend
      const imageUrls = reorderedImages.map(img => img.url);
      await updateImageOrder(restaurant.id || "", imageUrls);
      setImages(reorderedImages);
      setReorderedImages(reorderedImages);
      onUpdate({ ...restaurant, images: reorderedImages });
      toast.success(t("image_order_updated"));
      setIsOrderModalOpen(false);
    } catch (error) {
      console.error("Failed to update image order", error);
      toast.error(t("failed_to_update_image_order"));
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedImages = Array.from(images);
    const [movedImage] = reorderedImages.splice(result.source.index, 1);
    reorderedImages.splice(result.destination.index, 0, movedImage);
    setReorderedImages(reorderedImages);
  };

  const handleCancelOrderChange = () => {
    setIsOrderModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="section-title">{t("restaurant_images")}</h2>
          <h3 className="section-subtitle">
            {t("manage_your_restaurant_images")}
          </h3>
        </div>
        <div className="mb-4 flex justify-between items-center">
          <input
            type="file"
            multiple
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            onClick={handleUploadClick}
            className="primary-button px-3 py-1.5"
          >
            {t("upload_images")}
          </button>
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="secondary-button ml-4 px-3 py-1.5"
          >
            {t("reorder_images")}
          </button>
        </div>
      </div>
      <div className="h-line"></div>

      {images.length === 0 ? (
        <p>{t("no_restaurant_images")}</p>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {images.map((image, index) => (
            <div key={index} className="relative">
              <img
                src={image.imageUrls?.thumbnail || image.url}
                alt={`Restaurant Image ${index + 1}`}
                className="w-full h-auto cursor-pointer"
                onClick={() => openGallery(index)}
              />
              <button
                onClick={() => handleDeleteImageConfirmation(image)}
                className="absolute top-0 right-0 mt-2 mr-2"
              >
                <img
                  src="/images/x_icon.png"
                  alt="close"
                  style={{ width: "20px", height: "20px" }}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {isGalleryOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
          onClick={closeGallery}
        >
          <div className="relative">
            <button
              onClick={() => setIsGalleryOpen(false)}
              className="absolute top-0 right-0 mt-2 mr-2 text-white text-2xl"
            >
              &times;
            </button>
            <ImageGallery
              items={images.map((image) => ({
                original: image.imageUrls?.fullscreen || image.url,
                thumbnail: image.imageUrls?.thumbnail || image.url
              }))}
              startIndex={currentImageIndex}
              showThumbnails={false}
              showFullscreenButton={false}
              showPlayButton={false}
              showBullets={true}
              onImageLoad={() => window.dispatchEvent(new Event("resize"))}
            />
          </div>
        </div>
      )}

      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={handleCancelOrderChange}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">
              {t("reorder_images")}
            </h2>
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="images">
                  {(provided) => (
                    <ul
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {reorderedImages.map((image, index) => (
                        <Draggable
                          key={image.url}
                          draggableId={image.url}
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
                              <img
                                src={image.imageUrls?.thumbnail || image.url}
                                alt={`Image ${index + 1}`}
                                className="w-10 h-10 object-cover mr-2"
                              />
                              {`Image ${index + 1}`}
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={handleCancelOrderChange}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button onClick={handleSaveImageOrder} className="primary-button">
                {t("save_order")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteImageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsDeleteImageModalOpen(false)}
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
                <h2 className="text-lg font-semibold">{t("delete_image")}</h2>
                <p className="text-sm text-gray-500">
                  {t("delete_image_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <p className="text-sm text-black">
                {t("are_you_sure_you_want_to_delete_this_image")}
              </p>
            </div>
            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteImageModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button onClick={confirmDeleteImage} className="delete-button">
                {t("delete_image")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Images;

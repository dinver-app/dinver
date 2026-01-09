import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  getRestaurantJsonFiles,
  createJsonMenuFile,
  updateJsonMenuFile,
  deleteJsonMenuFile,
  importMenuFromJsonFile,
  JsonMenuFile,
  CreateJsonMenuFileData,
  ImportResult,
} from "../../services/jsonMenuFileService";
import { Restaurant } from "../../interfaces/Interfaces";

interface JsonMenuImportTabProps {
  restaurant: Restaurant;
}

const JsonMenuImportTab = ({ restaurant }: JsonMenuImportTabProps) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<JsonMenuFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportConfirmModal, setShowImportConfirmModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<JsonMenuFile | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateJsonMenuFileData>({
    filename: "",
    jsonContent: "",
    menuType: "food",
  });

  useEffect(() => {
    fetchFiles();
  }, [restaurant.id]);

  const fetchFiles = async () => {
    if (!restaurant.id) return;

    setIsLoading(true);
    try {
      const data = await getRestaurantJsonFiles(restaurant.id);
      setFiles(data);
    } catch (error) {
      console.error("Failed to fetch files:", error);
      toast.error("Failed to fetch JSON menu files");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFile = async () => {
    if (!restaurant.id) return;

    try {
      // Parse JSON content
      let parsedContent;
      try {
        parsedContent = JSON.parse(formData.jsonContent);
      } catch (error) {
        toast.error("Invalid JSON format");
        return;
      }

      const data: CreateJsonMenuFileData = {
        filename: formData.filename,
        jsonContent: parsedContent,
        menuType: formData.menuType,
      };

      await createJsonMenuFile(restaurant.id, data);
      toast.success("JSON menu file created successfully");
      setShowCreateModal(false);
      resetForm();
      fetchFiles();
    } catch (error: any) {
      toast.error(error.message || "Failed to create file");
    }
  };

  const handleUpdateFile = async () => {
    if (!selectedFile) return;

    try {
      // Parse JSON content if it's a string
      let parsedContent = formData.jsonContent;
      if (typeof formData.jsonContent === "string") {
        try {
          parsedContent = JSON.parse(formData.jsonContent);
        } catch (error) {
          toast.error("Invalid JSON format");
          return;
        }
      }

      await updateJsonMenuFile(selectedFile.id, {
        filename: formData.filename,
        jsonContent: parsedContent,
        menuType: formData.menuType,
      });

      toast.success("File updated successfully");
      setShowEditModal(false);
      resetForm();
      fetchFiles();
    } catch (error: any) {
      toast.error(error.message || "Failed to update file");
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile) return;

    try {
      await deleteJsonMenuFile(selectedFile.id);
      toast.success("File deleted successfully");
      setShowDeleteModal(false);
      setSelectedFile(null);
      fetchFiles();
    } catch (error: any) {
      toast.error("Failed to delete file");
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(selectedFile.id);
    setImportResult(null);
    setShowImportConfirmModal(false);

    try {
      const result = await importMenuFromJsonFile(selectedFile.id);
      setImportResult(result);
      toast.success(
        `Import completed! Created ${result.results.categories.created} categories and ${result.results.items.created} items.`
      );
      fetchFiles(); // Refresh to show updated status
    } catch (error: any) {
      toast.error(error.message || "Failed to import menu");
    } finally {
      setIsImporting(null);
      setSelectedFile(null);
    }
  };

  const resetForm = () => {
    setFormData({
      filename: "",
      jsonContent: "",
      menuType: "food",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (file: JsonMenuFile) => {
    setSelectedFile(file);
    setFormData({
      filename: file.filename,
      jsonContent: JSON.stringify(file.jsonContent, null, 2),
      menuType: file.menuType,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (file: JsonMenuFile) => {
    setSelectedFile(file);
    setShowDeleteModal(true);
  };

  const openImportConfirmModal = (file: JsonMenuFile) => {
    setSelectedFile(file);
    setShowImportConfirmModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-medium text-gray-800 mb-2">
            {t("json_menu_import")}
          </h2>
        </div>
        <button onClick={openCreateModal} className="primary-button">
          {t("add_json_file")}
        </button>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg">{t("loading_files")}</div>
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg mb-2">{t("no_json_menu_files_found")}</div>
            <div className="text-sm">
              {t("create_your_first_file_to_get_started")}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("filename")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("menu_type")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("created")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("status")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {file.filename}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          file.menuType === "food"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {file.menuType === "food" ? t("food") : t("drink")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          file.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {file.isActive ? t("active") : t("inactive")}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-4">
                        <button
                          onClick={() => openImportConfirmModal(file)}
                          disabled={isImporting === file.id}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          {isImporting === file.id
                            ? t("importing")
                            : t("import")}
                        </button>
                        <button
                          onClick={() => openEditModal(file)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => openDeleteModal(file)}
                          className="text-red-600 hover:text-red-900 font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 shadow-sm">
          <h3 className="text-2xl font-bold text-green-800 mb-6 text-center">
            ✅ {t("import_successful")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {importResult.results.categories.created}
              </div>
              <div className="text-base text-gray-700 font-medium">
                {t("categories_created")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {importResult.results.categories.existing}
              </div>
              <div className="text-base text-gray-700 font-medium">
                {t("categories_existing")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {importResult.results.items.created}
              </div>
              <div className="text-base text-gray-700 font-medium">
                {t("items_created")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {importResult.results.items.errors}
              </div>
              <div className="text-base text-gray-700 font-medium">
                {t("items_errors")}
              </div>
            </div>
          </div>
          {importResult.results.errors.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h5 className="font-semibold text-red-700 mb-3">
                {t("errors")}:
              </h5>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                {importResult.results.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="text-center">
            <button
              onClick={() => setImportResult(null)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {showCreateModal
                  ? t("create_new_json_file")
                  : t("edit_json_file")}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("filename")}
                </label>
                <input
                  type="text"
                  value={formData.filename}
                  onChange={(e) =>
                    setFormData({ ...formData, filename: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                  placeholder="e.g., food-menu.json"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("menu_type")}
                </label>
                <select
                  value={formData.menuType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      menuType: e.target.value as "food" | "drink",
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded outline-gray-300"
                >
                  <option value="food">{t("food")} Menu</option>
                  <option value="drink">{t("drink")} Menu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("json_content")}
                </label>
                <textarea
                  value={formData.jsonContent}
                  onChange={(e) =>
                    setFormData({ ...formData, jsonContent: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded outline-gray-300 font-mono text-sm"
                  rows={15}
                  placeholder={`{
  "categories": [
    {
      "name": {
        "hr": "Glavna jela",
        "en": "Main dishes"
      }
    }
  ],
  "items": [
    {
      "name": {
        "hr": "Pasta Carbonara",
        "en": "Pasta Carbonara"
      },
      "price": "15.50",
      "categoryName": "Glavna jela"
    }
  ]
}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("enter_valid_json_content_for_your_menu")}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={showCreateModal ? handleCreateFile : handleUpdateFile}
                className="primary-button"
              >
                {showCreateModal ? t("create_file") : t("update_file")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 mr-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {t("delete_file")}
                </h3>
                <p className="text-base text-gray-600 mt-1">
                  {t("are_you_sure_you_want_to_delete")} "
                  {selectedFile.filename}"?
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">File:</span>
                  <span>{selectedFile.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Menu Type:</span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedFile.menuType === "food"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {selectedFile.menuType === "food" ? "Food" : "Drink"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Created:</span>
                  <span>{formatDate(selectedFile.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="secondary-button px-6 py-3"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteFile}
                className="delete-button px-6 py-3"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Confirmation Modal */}
      {showImportConfirmModal && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 mr-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {t("confirm_import")}
                </h3>
                <p className="text-gray-600">
                  {t("are_you_sure_you_want_to_import")} "
                  {selectedFile.filename}"?
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">{t("file")}:</span>
                  <span>{selectedFile.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t("menu_type_label")}</span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedFile.menuType === "food"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {selectedFile.menuType === "food" ? t("food") : t("drink")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t("created_label")}</span>
                  <span>{formatDate(selectedFile.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-yellow-800 mb-1">
                    {t("warning")}
                  </p>
                  <p>{t("import_warning_message")}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowImportConfirmModal(false)}
                className="secondary-button px-6 py-3"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting === selectedFile.id}
                className="primary-button px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting === selectedFile.id
                  ? t("importing")
                  : t("import_menu")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonMenuImportTab;

import { useEffect, useState } from "react";
import {
  getAllQRPrintRequests,
  QRPrintRequest,
  updateQRPrintRequestStatus,
  deleteQRPrintRequest,
} from "../services/qrPrintRequestService";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { EyeIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { QrCodeIcon } from "@heroicons/react/24/outline";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";

const QRPrintRequests = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<QRPrintRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("date_desc");
  const [selectedRequest, setSelectedRequest] = useState<QRPrintRequest | null>(
    null
  );
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);
  const [qrError, setQrError] = useState("");

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, [searchTerm, sortOption, statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getAllQRPrintRequests({
        search: searchTerm,
        status: statusFilter || undefined,
      });
      let sorted = [...data];
      if (sortOption === "date_desc") {
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else if (sortOption === "date_asc") {
        sorted.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      } else if (sortOption === "status") {
        sorted.sort((a, b) => a.status.localeCompare(b.status));
      }
      setRequests(sorted);
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (req: QRPrintRequest) => {
    setSelectedRequest(req);
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;
    try {
      await deleteQRPrintRequest(selectedRequest.id);
      toast.success(t("qr_print_request_deleted_successfully"));
      setShowDeleteModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (e) {
      toast.error(t("status_updated_error"));
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!selectedRequest) return;
    setStatusLoading(status);
    try {
      await updateQRPrintRequestStatus(selectedRequest.id, status);
      await fetchRequests(); // Refetch full list for correct user/restaurant
      toast.success(t("status_updated_success"));
      setSelectedRequest(
        requests.find((r) => r.id === selectedRequest.id) || null
      );
    } catch (e) {
      toast.error(t("status_updated_error"));
    } finally {
      setStatusLoading(null);
    }
  };

  const statusPill = (status: string, t: any) => {
    let color = "bg-gray-100 text-gray-700";
    if (status === "pending") color = "bg-yellow-100 text-yellow-800";
    else if (status === "approved") color = "bg-green-100 text-green-800";
    else if (status === "printed") color = "bg-blue-100 text-blue-800";
    else if (status === "rejected") color = "bg-red-100 text-red-800";
    return (
      <span
        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${color}`}
      >
        {t(status)}
      </span>
    );
  };

  const handleDownloadSVG = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qr-code.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new window.Image();
    img.src = "data:image/svg+xml;base64," + window.btoa(xml);
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "qr-code.png";
      a.click();
    };
  };

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="mx-auto p-4">
      {/* QR GENERATOR BUTTON */}
      <div className="flex justify-end mb-4">
        <button
          className="px-3 py-1.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition text-sm"
          onClick={() => {
            setShowQRModal(true);
            setQrUrl("");
            setQrError("");
          }}
        >
          + {t("generate_static_qr")}
        </button>
      </div>
      {/* QR GENERATOR MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <QrCodeIcon className="w-6 h-6 text-blue-600" />
              {t("generate_static_qr")}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {t("enter_url_to_generate_qr")}
            </p>
            <input
              type="text"
              value={qrUrl}
              onChange={(e) => {
                setQrUrl(e.target.value);
                setQrError("");
              }}
              placeholder="https://example.com"
              className="w-full p-2 border border-gray-300 rounded mb-2"
            />
            {qrError && (
              <div className="text-xs text-red-600 mb-2">{qrError}</div>
            )}
            <div className="flex flex-col items-center my-4" ref={qrRef}>
              {qrUrl && validateUrl(qrUrl) ? (
                <QRCodeSVG value={qrUrl} size={200} />
              ) : (
                <div className="text-gray-400 text-xs italic h-[200px] flex items-center justify-center">
                  {t("enter_valid_url_to_preview_qr")}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center mt-2">
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium"
                disabled={!qrUrl || !validateUrl(qrUrl)}
                onClick={() => {
                  if (!qrUrl || !validateUrl(qrUrl)) {
                    setQrError(t("invalid_url"));
                    return;
                  }
                  handleDownloadSVG();
                }}
              >
                {t("download_svg")}
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium"
                disabled={!qrUrl || !validateUrl(qrUrl)}
                onClick={() => {
                  if (!qrUrl || !validateUrl(qrUrl)) {
                    setQrError(t("invalid_url"));
                    return;
                  }
                  handleDownloadPNG();
                }}
              >
                {t("download_png")}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">{t("qr_print_requests")}</h1>
        <h3 className="page-subtitle">{t("list_of_all_qr_print_requests")}</h3>
      </div>
      <div className="h-line mb-4"></div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
        <input
          type="text"
          placeholder={t("search")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
        />
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
          >
            <option value="">{t("all_statuses")}</option>
            <option value="pending">{t("pending")}</option>
            <option value="approved">{t("approved")}</option>
            <option value="printed">{t("printed")}</option>
            <option value="rejected">{t("rejected")}</option>
          </select>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded outline-gray-300"
          >
            <option value="date_desc">{t("date_desc")}</option>
            <option value="date_asc">{t("date_asc")}</option>
            <option value="status">{t("status")}</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div>{t("loading")}</div>
      ) : requests.length === 0 ? (
        <div className="text-center text-gray-500">
          {t("no_qr_print_requests_available")}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr className="text-sm text-black">
                <th className="py-2 px-4 text-left font-normal w-64">
                  {t("user")}
                </th>
                <th className="py-2 px-4 text-left font-normal w-64">
                  {t("restaurant")}
                </th>
                <th className="py-2 px-4 text-left font-normal w-32">
                  {t("quantity")}
                </th>
                <th className="py-2 px-4 text-left font-normal w-32">
                  {t("status")}
                </th>
                <th className="py-2 px-4 text-left font-normal w-48">
                  {t("created_at")}
                </th>
                <th className="py-2 px-4 text-left font-normal w-10"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr
                  key={req.id}
                  className="hover:bg-gray-100 border-b border-gray-200"
                >
                  <td className="py-2 px-4 text-sm w-64">
                    {req.user
                      ? `${req.user.firstName} ${req.user.lastName} (${req.user.email})`
                      : "-"}
                  </td>
                  <td className="py-2 px-4 text-sm w-64">
                    {req.restaurant ? req.restaurant.name : "-"}
                  </td>
                  <td className="py-2 px-4 text-sm w-32">{req.quantity}</td>
                  <td className="py-2 px-4 text-sm w-32">
                    {statusPill(req.status, t)}
                  </td>
                  <td className="py-2 px-4 text-sm w-48">
                    {format(new Date(req.createdAt), "dd.MM.yyyy. HH:mm")}
                  </td>
                  <td className="py-2 px-4 text-sm w-10">
                    <button
                      onClick={() => handleOpenModal(req)}
                      className="text-blue-500 hover:text-blue-700 flex items-center justify-center"
                      title={t("view_details")}
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative overflow-y-auto max-h-full">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <QrCodeIcon className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3 text-blue-600 bg-white" />
              <div>
                <h2 className="text-lg font-semibold">
                  {t("qr_print_request_details")}
                </h2>
                <p className="text-sm text-gray-500">
                  {t("view_qr_print_request_details")}
                </p>
              </div>
            </div>
            <div className="h-line mb-4"></div>
            {/* Status update buttons */}
            <div className="flex gap-2 mb-6">
              <button
                className="px-3 py-1 rounded bg-green-100 text-green-800 text-xs font-medium hover:bg-green-200 transition disabled:opacity-50"
                title={t("approve")}
                disabled={
                  selectedRequest.status === "approved" ||
                  statusLoading !== null
                }
                onClick={() => handleStatusUpdate("approved")}
              >
                {statusLoading === "approved" ? (
                  <span className="loader inline-block w-4 h-4 align-middle mr-1" />
                ) : null}
                {t("approve")}
              </button>
              <button
                className="px-3 py-1 rounded bg-red-100 text-red-800 text-xs font-medium hover:bg-red-200 transition disabled:opacity-50"
                title={t("reject")}
                disabled={
                  selectedRequest.status === "rejected" ||
                  statusLoading !== null
                }
                onClick={() => handleStatusUpdate("rejected")}
              >
                {statusLoading === "rejected" ? (
                  <span className="loader inline-block w-4 h-4 align-middle mr-1" />
                ) : null}
                {t("reject")}
              </button>
              <button
                className="px-3 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium hover:bg-blue-200 transition disabled:opacity-50"
                title={t("mark_as_printed")}
                disabled={
                  selectedRequest.status === "printed" || statusLoading !== null
                }
                onClick={() => handleStatusUpdate("printed")}
              >
                {statusLoading === "printed" ? (
                  <span className="loader inline-block w-4 h-4 align-middle mr-1" />
                ) : null}
                {t("mark_as_printed")}
              </button>
              {selectedRequest.status !== "pending" && (
                <button
                  className="px-3 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium hover:bg-yellow-200 transition disabled:opacity-50"
                  title={t("pending")}
                  disabled={
                    selectedRequest.status === "pending" ||
                    statusLoading !== null
                  }
                  onClick={() => handleStatusUpdate("pending")}
                >
                  {statusLoading === "pending" ? (
                    <span className="loader inline-block w-4 h-4 align-middle mr-1" />
                  ) : null}
                  {t("pending")}
                </button>
              )}
              <button
                className="px-3 py-1 rounded bg-gray-100 text-gray-800 text-xs font-medium hover:bg-gray-200 border border-gray-300 ml-4"
                title={t("delete")}
                onClick={() => setShowDeleteModal(true)}
              >
                {t("delete")}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <h3 className="text-sm font-semibold">{t("restaurant")}</h3>
                <p className="text-xs text-gray-600">
                  {selectedRequest.restaurant?.name || "-"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("user")}</h3>
                <p className="text-xs text-gray-600">
                  {selectedRequest.user
                    ? `${selectedRequest.user.firstName} ${selectedRequest.user.lastName} (${selectedRequest.user.email})`
                    : "-"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("quantity")}</h3>
                <p className="text-xs text-gray-600">
                  {selectedRequest.quantity}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("status")}</h3>
                <p className="text-xs text-gray-600">
                  {statusPill(selectedRequest.status, t)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("created_at")}</h3>
                <p className="text-xs text-gray-600">
                  {format(
                    new Date(selectedRequest.createdAt),
                    "dd.MM.yyyy. HH:mm"
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {t("show_dinver_logo_label")}
                </h3>
                <p className="text-xs text-gray-600">
                  {selectedRequest.showDinverLogo ? t("yes") : t("no")}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {t("show_restaurant_name_label")}
                </h3>
                <p className="text-xs text-gray-600">
                  {selectedRequest.showRestaurantName ? t("yes") : t("no")}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {t("show_scan_text_label")}
                </h3>
                <p className="text-xs text-gray-600">
                  {selectedRequest.showScanText ? t("yes") : t("no")}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {t("text_position_label")}
                </h3>
                <p className="text-xs text-gray-600">
                  {selectedRequest.textPosition}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-sm font-semibold">
                    {t("text_color_label")}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {selectedRequest.qrTextColor}
                  </p>
                </div>
                <span
                  className="w-5 h-5 rounded border border-gray-300"
                  style={{ backgroundColor: selectedRequest.qrTextColor }}
                ></span>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-sm font-semibold">
                    {t("background_color_label")}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {selectedRequest.qrBackgroundColor}
                  </p>
                </div>
                <span
                  className="w-5 h-5 rounded border border-gray-300"
                  style={{ backgroundColor: selectedRequest.qrBackgroundColor }}
                ></span>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-sm font-semibold">
                    {t("border_color_label")}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {selectedRequest.qrBorderColor}
                  </p>
                </div>
                <span
                  className="w-5 h-5 rounded border border-gray-300"
                  style={{ backgroundColor: selectedRequest.qrBorderColor }}
                ></span>
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {t("border_width_label")}
                </h3>
                <p className="text-xs text-gray-600">
                  {selectedRequest.qrBorderWidth}px
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("padding_label")}</h3>
                <p className="text-xs text-gray-600">
                  {selectedRequest.padding}px
                </p>
              </div>
              {selectedRequest.customText && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold">{t("custom_text")}</h3>
                  <p className="text-xs text-gray-600">
                    {selectedRequest.customText}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{t("confirm_delete")}</h2>
              <p className="text-sm text-gray-600 mt-2">
                {t("are_you_sure_you_want_to_delete_the_item")}
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDelete}
                className="primary-button bg-red-600 hover:bg-red-700 text-white"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRPrintRequests;

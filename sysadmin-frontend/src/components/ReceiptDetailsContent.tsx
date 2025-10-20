import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  receiptService,
  UpdateReceiptData,
  ApproveReceiptData,
  RejectReceiptData,
  Receipt,
} from "../services/receiptService";
import toast from "react-hot-toast";
import RestaurantPickerModal from "./RestaurantPickerModal";
import { RestaurantLite } from "../services/restaurantAdminService";

interface Props {
  receipt: Receipt;
  onClose: () => void;
  onUpdate: () => void;
}

const ReceiptDetailsContent: React.FC<Props> = ({
  receipt,
  onClose,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<UpdateReceiptData>({
    oib: receipt.oib || "",
    jir: receipt.jir || "",
    zki: receipt.zki || "",
    totalAmount: receipt.totalAmount || 0,
    issueDate: receipt.issueDate || "",
    issueTime: receipt.issueTime || "",
    restaurantId: receipt.restaurantId || "",
  });
  const [loading, setLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const pointsPreview = Math.floor((formData.totalAmount || 0) / 10);

  useEffect(() => {
    // no-op: placeholder for potential data preloads
  }, []);

  const handleInputChange = (field: keyof UpdateReceiptData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      await receiptService.updateReceiptData(receipt.id, formData);
      toast.success(t("receipts.update_success"));
      onUpdate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("receipts.update_failed")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!isFormValid()) {
      toast.error(t("receipts.all_fields_required"));
      return;
    }

    if (
      !confirm(t("receipts.confirm_award_points", { points: pointsPreview }))
    ) {
      return;
    }

    try {
      setLoading(true);
      const approveData: ApproveReceiptData = {
        restaurantId: formData.restaurantId!,
        totalAmount: formData.totalAmount!,
        jir: formData.jir!,
        zki: formData.zki!,
        oib: formData.oib!,
        issueDate: formData.issueDate!,
        issueTime: formData.issueTime!,
      };

      await receiptService.approveReceipt(receipt.id, approveData);
      toast.success(t("receipts.approve_success", { points: pointsPreview }));
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("receipts.approve_failed")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantPicked = (r: RestaurantLite) => {
    setFormData((prev) => ({
      ...prev,
      restaurantId: r.id,
      oib: r.oib || prev.oib,
    }));
    setPickerOpen(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error(t("receipts.rejection_reason_required"));
      return;
    }

    try {
      setLoading(true);
      const rejectData: RejectReceiptData = {
        rejectionReason: rejectionReason.trim(),
      };

      await receiptService.rejectReceipt(receipt.id, rejectData);
      toast.success(t("receipts.reject_success"));
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("receipts.reject_failed")
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isFormValid = () => {
    return !!(
      formData.restaurantId &&
      formData.totalAmount &&
      formData.jir &&
      formData.zki &&
      formData.oib &&
      formData.issueDate &&
      formData.issueTime
    );
  };

  const userLat =
    receipt.locationLat != null ? Number(receipt.locationLat) : undefined;
  const userLng =
    receipt.locationLng != null ? Number(receipt.locationLng) : undefined;
  const numericLat =
    typeof userLat === "number" && Number.isFinite(userLat)
      ? userLat
      : undefined;
  const numericLng =
    typeof userLng === "number" && Number.isFinite(userLng)
      ? userLng
      : undefined;

  return (
    <div className="p-6">
      <div className="bg-white rounded-md shadow p-5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            {t("receipts.details_title")} - {receipt.status.toUpperCase()}
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-2">
                {t("receipts.image")}
              </h4>
              <div
                className={`relative border rounded-lg overflow-hidden ${
                  isImageZoomed ? "fixed inset-4 z-10 bg-white" : ""
                }`}
                onClick={() => setIsImageZoomed(!isImageZoomed)}
              >
                <img
                  src={receipt.imageUrl}
                  alt="Receipt"
                  className={`w-full cursor-pointer ${
                    isImageZoomed
                      ? "h-full object-contain"
                      : "h-64 object-cover"
                  }`}
                />
                {!isImageZoomed && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm opacity-0 hover:opacity-100 transition-opacity">
                      {t("common.click_to_zoom")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-2">
                {t("receipts.user_info")}
              </h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>
                  <strong>{t("common.name")}:</strong> {receipt.user?.firstName}{" "}
                  {receipt.user?.lastName}
                </p>
                <p>
                  <strong>{t("common.email")}:</strong> {receipt.user?.email}
                </p>
                <p>
                  <strong>{t("receipts.submitted")}:</strong>{" "}
                  {formatDate(receipt.submittedAt)}
                </p>
                {receipt.locationLat != null && receipt.locationLng != null && (
                  <p>
                    <strong>{t("common.location")}:</strong>{" "}
                    {Number.isFinite(Number(receipt.locationLat))
                      ? Number(receipt.locationLat).toFixed(6)
                      : String(receipt.locationLat)}
                    ,{" "}
                    {Number.isFinite(Number(receipt.locationLng))
                      ? Number(receipt.locationLng).toFixed(6)
                      : String(receipt.locationLng)}
                  </p>
                )}
              </div>
            </div>

            {receipt.ocrData && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">
                  {t("receipts.ocr_raw")}
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                    {JSON.stringify(receipt.ocrData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">
              {t("receipts.data")}
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("receipts.oib_label")}
                </label>
                <input
                  type="text"
                  value={formData.oib}
                  onChange={(e) => handleInputChange("oib", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678901"
                  maxLength={11}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("receipts.jir_label")}
                </label>
                <input
                  type="text"
                  value={formData.jir}
                  onChange={(e) => handleInputChange("jir", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("receipts.jir_placeholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("receipts.zki_label")}
                </label>
                <input
                  type="text"
                  value={formData.zki}
                  onChange={(e) => handleInputChange("zki", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("receipts.zki_placeholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("receipts.total_amount_label")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.totalAmount}
                  onChange={(e) =>
                    handleInputChange(
                      "totalAmount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("receipts.issue_date")}
                </label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) =>
                    handleInputChange("issueDate", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("receipts.issue_time")}
                </label>
                <input
                  type="time"
                  value={formData.issueTime}
                  onChange={(e) =>
                    handleInputChange("issueTime", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("receipts.restaurant")}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    disabled
                    value={formData.restaurantId || ""}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-600"
                    placeholder={t("receipts.no_restaurant")}
                  />
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  >
                    {t("common.choose")}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="text-sm font-medium text-blue-900 mb-1">
                  {t("receipts.points_preview")}
                </h5>
                <p className="text-lg font-bold text-blue-600">
                  {t("receipts.points_value", { points: pointsPreview })}
                </p>
                <p className="text-xs text-blue-600">
                  {t("receipts.points_rule")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between sticky bottom-0 bg-white py-3 border-t">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSaveChanges}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              {loading ? t("common.saving") : t("common.save_changes")}
            </button>

            {receipt.status === "pending" && (
              <>
                <button
                  onClick={() => setShowRejectForm(!showRejectForm)}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                >
                  {showRejectForm
                    ? t("receipts.cancel_reject")
                    : t("common.reject")}
                </button>

                <button
                  onClick={handleApprove}
                  disabled={loading || !isFormValid()}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-green-600 text-white shadow-sm hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                >
                  {loading ? t("receipts.approving") : t("common.approve")}
                </button>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
          >
            {t("common.back")}
          </button>
        </div>

        {showRejectForm && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h5 className="text-sm font-medium text-red-900 mb-2">
              {t("receipts.rejection_reason")}
            </h5>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border border-red-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
              placeholder={t("receipts.rejection_reason_placeholder")}
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
                className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
              >
                {loading
                  ? t("receipts.rejecting")
                  : t("receipts.confirm_reject")}
              </button>
              <button
                onClick={() => setShowRejectForm(false)}
                className="inline-flex items-center px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}

        <RestaurantPickerModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleRestaurantPicked}
          userLat={numericLat}
          userLng={numericLng}
        />
      </div>
    </div>
  );
};

export default ReceiptDetailsContent;

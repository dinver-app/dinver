import React, { useState, useEffect } from "react";
import {
  receiptService,
  Receipt,
  UpdateReceiptData,
  ApproveReceiptData,
  RejectReceiptData,
} from "../services/receiptService";
import toast from "react-hot-toast";

interface ReceiptDetailModalProps {
  receipt: Receipt;
  onClose: () => void;
  onUpdate: () => void;
}

const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({
  receipt,
  onClose,
  onUpdate,
}) => {
  const [formData, setFormData] = useState<UpdateReceiptData>({
    oib: receipt.oib || "",
    jir: receipt.jir || "",
    zki: receipt.zki || "",
    totalAmount: receipt.totalAmount || 0,
    issueDate: receipt.issueDate || "",
    issueTime: receipt.issueTime || "",
    restaurantId: receipt.restaurantId || "",
  });
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Calculate points preview
  const pointsPreview = Math.floor((formData.totalAmount || 0) / 10);

  useEffect(() => {
    // In a real app, you'd fetch restaurants from an API
    // For now, we'll use a mock list or empty array
    setRestaurants([]);
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
      toast.success("Receipt data updated successfully");
      onUpdate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update receipt"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (
      !formData.restaurantId ||
      !formData.totalAmount ||
      !formData.jir ||
      !formData.zki ||
      !formData.oib ||
      !formData.issueDate ||
      !formData.issueTime
    ) {
      toast.error("All fields are required for approval");
      return;
    }

    if (!confirm(`Award ${pointsPreview} points to user?`)) {
      return;
    }

    try {
      setLoading(true);
      const approveData: ApproveReceiptData = {
        restaurantId: formData.restaurantId,
        totalAmount: formData.totalAmount,
        jir: formData.jir,
        zki: formData.zki,
        oib: formData.oib,
        issueDate: formData.issueDate,
        issueTime: formData.issueTime,
      };

      await receiptService.approveReceipt(receipt.id, approveData);
      toast.success(`Receipt approved! ${pointsPreview} points awarded.`);
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to approve receipt"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    try {
      setLoading(true);
      const rejectData: RejectReceiptData = {
        rejectionReason: rejectionReason.trim(),
      };

      await receiptService.rejectReceipt(receipt.id, rejectData);
      toast.success("Receipt rejected");
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reject receipt"
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

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Receipt Details - {receipt.status.toUpperCase()}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Image and User Info */}
            <div>
              {/* Image */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">
                  Receipt Image
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
                        Click to zoom
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">
                  User Information
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p>
                    <strong>Name:</strong> {receipt.user?.firstName}{" "}
                    {receipt.user?.lastName}
                  </p>
                  <p>
                    <strong>Email:</strong> {receipt.user?.email}
                  </p>
                  <p>
                    <strong>Submitted:</strong>{" "}
                    {formatDate(receipt.submittedAt)}
                  </p>
                  {receipt.locationLat && receipt.locationLng && (
                    <p>
                      <strong>Location:</strong>{" "}
                      {receipt.locationLat.toFixed(6)},{" "}
                      {receipt.locationLng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              {/* OCR Data (if available) */}
              {receipt.ocrData && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">
                    OCR Raw Data
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                      {JSON.stringify(receipt.ocrData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Form */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Receipt Data
              </h4>

              <div className="space-y-4">
                {/* OIB */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OIB (11 digits) *
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

                {/* JIR */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    JIR *
                  </label>
                  <input
                    type="text"
                    value={formData.jir}
                    onChange={(e) => handleInputChange("jir", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Jedinstveni identifikator računa"
                  />
                </div>

                {/* ZKI */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZKI *
                  </label>
                  <input
                    type="text"
                    value={formData.zki}
                    onChange={(e) => handleInputChange("zki", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Završni kontrolni identifikator"
                  />
                </div>

                {/* Total Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount (€) *
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

                {/* Issue Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Date *
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

                {/* Issue Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Time *
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

                {/* Restaurant */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restaurant *
                  </label>
                  <select
                    value={formData.restaurantId}
                    onChange={(e) =>
                      handleInputChange("restaurantId", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select restaurant...</option>
                    {restaurants.map((restaurant) => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}{" "}
                        {restaurant.oib && `(${restaurant.oib})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Points Preview */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-blue-900 mb-1">
                    Points Preview
                  </h5>
                  <p className="text-lg font-bold text-blue-600">
                    {pointsPreview} bodova
                  </p>
                  <p className="text-xs text-blue-600">(10€ = 1 bod)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-between">
            <div className="flex space-x-3">
              <button
                onClick={handleSaveChanges}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>

              {receipt.status === "pending" && (
                <>
                  <button
                    onClick={() => setShowRejectForm(!showRejectForm)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    {showRejectForm ? "Cancel Reject" : "Reject"}
                  </button>

                  <button
                    onClick={handleApprove}
                    disabled={loading || !isFormValid()}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? "Approving..." : "Approve"}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Close
            </button>
          </div>

          {/* Rejection Form */}
          {showRejectForm && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h5 className="text-sm font-medium text-red-900 mb-2">
                Rejection Reason
              </h5>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border border-red-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder="Enter reason for rejection..."
              />
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Rejecting..." : "Confirm Reject"}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptDetailModal;

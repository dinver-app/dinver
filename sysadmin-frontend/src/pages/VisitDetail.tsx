import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { visitService } from "../services/visitService";
import { Visit, UpdateReceiptPayload } from "../interfaces/Visit";
import toast from "react-hot-toast";

const VisitDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Receipt form state
  const [receiptForm, setReceiptForm] = useState<UpdateReceiptPayload>({
    totalAmount: undefined,
    issueDate: undefined,
    issueTime: undefined,
    jir: undefined,
    zki: undefined,
    oib: undefined,
    merchantName: undefined,
    merchantAddress: undefined,
  });

  const fetchVisit = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await visitService.getVisitById(id);
      setVisit(data);

      // Initialize form with receipt data
      if (data.receipt) {
        setReceiptForm({
          totalAmount: data.receipt.totalAmount
            ? Number(data.receipt.totalAmount)
            : undefined,
          issueDate: data.receipt.issueDate,
          issueTime: data.receipt.issueTime,
          jir: data.receipt.jir,
          zki: data.receipt.zki,
          oib: data.receipt.oib,
          merchantName: data.receipt.merchantName,
          merchantAddress: data.receipt.merchantAddress,
        });
      }
    } catch (err) {
      toast.error("Failed to load visit");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisit();
  }, [id]);

  const handleSaveReceipt = async () => {
    if (!visit?.receipt?.id) return;

    try {
      setSaving(true);
      await visitService.updateReceipt(visit.receipt.id, receiptForm);
      toast.success("Receipt data updated successfully");
      fetchVisit(); // Refresh data
    } catch (err) {
      toast.error("Failed to update receipt");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // NOTE: Visit approval/rejection removed - handled through Receipts page
  // Visit status is automatically updated when receipt is approved/rejected

  const handleDeleteClick = () => {
    setDeleteConfirmText("");
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!visit?.id) return;

    const visitId = `#${visit.id.substring(0, 8)}`;

    if (deleteConfirmText !== visitId) {
      toast.error(`Please type "${visitId}" to confirm deletion`);
      return;
    }

    try {
      setSaving(true);
      await visitService.deleteVisit(visit.id);
      toast.success("Visit deleted successfully");
      navigate("/visits");
    } catch (err) {
      toast.error("Failed to delete visit");
      console.error(err);
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses =
      "px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide inline-block";
    switch (status) {
      case "PENDING":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "APPROVED":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "REJECTED":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Visit not found</p>
          <button
            onClick={() => navigate("/visits")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Visits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/visits")}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Visits
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Visit Details
            </h1>
            <div className="flex items-center gap-3">
              <span className={getStatusBadge(visit.status)}>
                {visit.status}
              </span>
              <span className="text-sm text-gray-500">
                ID: {visit.id.substring(0, 8)}...
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* NOTE: Approve/Reject removed - handled through Receipts page */}
            <button
              onClick={handleDeleteClick}
              disabled={saving}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Receipt Image & Info */}
        <div className="space-y-6">
          {/* Receipt Image */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Receipt Image
            </h2>
            {visit.receipt?.originalUrl ? (
              <div className="space-y-4">
                <img
                  src={visit.receipt.fullscreenUrl || visit.receipt.originalUrl}
                  alt="Receipt"
                  className="w-full rounded-lg border-2 border-gray-200"
                />
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={visit.receipt.thumbnailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Thumbnail
                  </a>
                  <a
                    href={visit.receipt.mediumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Medium
                  </a>
                  <a
                    href={visit.receipt.fullscreenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Fullscreen
                  </a>
                </div>
                <a
                  href={visit.receipt.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                >
                  View Original (High Quality)
                </a>
              </div>
            ) : (
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No receipt image available</p>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              User Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Name
                </label>
                <p className="text-base text-gray-900">
                  {visit.user ? `${visit.user.name}` : "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Email
                </label>
                <p className="text-base text-gray-900">
                  {visit.user?.email || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Phone
                </label>
                <p className="text-base text-gray-900">
                  {visit.user?.phone || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Restaurant Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Restaurant</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Name
                </label>
                <p className="text-base text-gray-900 font-semibold">
                  {visit.restaurant?.name || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Location
                </label>
                <p className="text-base text-gray-900">
                  {visit.restaurant?.place || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Address
                </label>
                <p className="text-base text-gray-500">
                  {visit.restaurant?.address || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Visit Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Visit Metadata
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Submitted At
                </label>
                <p className="text-base text-gray-900">
                  {formatDate(visit.submittedAt)}
                </p>
              </div>
              {visit.reviewedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Reviewed At
                  </label>
                  <p className="text-base text-gray-900">
                    {formatDate(visit.reviewedAt)}
                  </p>
                </div>
              )}
              {visit.rejectionReason && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Rejection Reason
                  </label>
                  <p className="text-base text-red-600">
                    {visit.rejectionReason}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Was in Must Visit?
                </label>
                <p className="text-base text-gray-900">
                  {visit.wasInMustVisit ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </div>

          {/* Experience Link */}
          {visit.experience && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-purple-900 mb-2">
                Experience Posted
              </h2>
              <p className="text-sm text-purple-700 mb-3">
                {visit.experience.title}
              </p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-200 text-purple-800">
                {visit.experience.status}
              </span>
            </div>
          )}
        </div>

        {/* Right Column - Receipt Data Form */}
        <div className="space-y-6">
          {visit.receipt && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  Receipt Data (OCR)
                </h2>
                <button
                  onClick={handleSaveReceipt}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>

              <div className="space-y-4">
                {/* Total Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Total Amount *{" "}
                    <span className="text-red-500">Required</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={receiptForm.totalAmount || ""}
                      onChange={(e) =>
                        setReceiptForm({
                          ...receiptForm,
                          totalAmount: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                      €
                    </span>
                  </div>
                </div>

                {/* Issue Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Issue Date * <span className="text-red-500">Required</span>
                  </label>
                  <input
                    type="date"
                    value={receiptForm.issueDate || ""}
                    onChange={(e) =>
                      setReceiptForm({
                        ...receiptForm,
                        issueDate: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Issue Time */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Issue Time * <span className="text-red-500">Required</span>
                  </label>
                  <input
                    type="time"
                    value={receiptForm.issueTime || ""}
                    onChange={(e) =>
                      setReceiptForm({
                        ...receiptForm,
                        issueTime: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* JIR */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    JIR * <span className="text-red-500">Required</span>
                  </label>
                  <input
                    type="text"
                    value={receiptForm.jir || ""}
                    onChange={(e) =>
                      setReceiptForm({ ...receiptForm, jir: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="JIR code"
                  />
                </div>

                {/* ZKI */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ZKI * <span className="text-red-500">Required</span>
                  </label>
                  <input
                    type="text"
                    value={receiptForm.zki || ""}
                    onChange={(e) =>
                      setReceiptForm({ ...receiptForm, zki: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="ZKI code"
                  />
                </div>

                {/* OIB */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    OIB * <span className="text-red-500">Required</span>
                  </label>
                  <input
                    type="text"
                    value={receiptForm.oib || ""}
                    onChange={(e) =>
                      setReceiptForm({ ...receiptForm, oib: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="11-digit OIB"
                    maxLength={11}
                  />
                </div>

                {/* Merchant Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Merchant Name
                  </label>
                  <input
                    type="text"
                    value={receiptForm.merchantName || ""}
                    onChange={(e) =>
                      setReceiptForm({
                        ...receiptForm,
                        merchantName: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Business name"
                  />
                </div>

                {/* Merchant Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Merchant Address
                  </label>
                  <input
                    type="text"
                    value={receiptForm.merchantAddress || ""}
                    onChange={(e) =>
                      setReceiptForm({
                        ...receiptForm,
                        merchantAddress: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Business address"
                  />
                </div>
              </div>

              {/* OCR Confidence Scores */}
              {visit.receipt.autoApproveScore !== undefined && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    OCR Confidence
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Auto-Approve Score:</span>
                      <span className="font-mono font-bold">
                        {(visit.receipt.autoApproveScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    {visit.receipt.visionConfidence !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span>Vision Confidence:</span>
                        <span className="font-mono">
                          {(visit.receipt.visionConfidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && visit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Delete Visit
                </h3>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                Are you sure you want to delete this visit? This action cannot
                be undone.
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                <p className="text-sm font-semibold text-red-800">
                  Visit ID: #{visit.id.substring(0, 8)}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  All associated data (receipt, experience, images) will be
                  permanently deleted.
                </p>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type{" "}
                <span className="font-bold text-red-600">
                  #{visit.id.substring(0, 8)}
                </span>{" "}
                to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type visit ID to confirm"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={
                  saving || deleteConfirmText !== `#${visit.id.substring(0, 8)}`
                }
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitDetail;

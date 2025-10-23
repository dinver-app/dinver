import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { receiptService, Receipt } from "../services/receiptService";
import ReceiptDetailsContent from "../components/ReceiptDetailsContent";

const ReceiptDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      if (!id) return;
      const r = await receiptService.getReceiptById(id);
      setReceipt(r);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load receipt");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-100 rounded" />
          <div className="space-y-3">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="p-6">
        <p className="text-red-600 mb-4">{error || "Receipt not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <ReceiptDetailsContent
      receipt={receipt}
      onClose={() => navigate(-1)}
      onUpdate={load}
    />
  );
};

export default ReceiptDetails;

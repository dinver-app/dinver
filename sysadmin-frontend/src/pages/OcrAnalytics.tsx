import { useEffect, useState } from "react";
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  CpuChipIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { getOcrAnalytics } from "../services/receiptService";

// Types
interface OcrAnalytics {
  overview: {
    totalReceipts: number;
    totalApproved: number;
    totalWithAccuracy: number;
    avgAccuracy: number | string | null;
    avgCorrections: number | string | null;
  };
  methodStats: Record<
    string,
    {
      total: number;
      approved: number;
      rejected: number;
      pending: number;
      avgAccuracy: number | string | null;
      avgCorrections: number | string | null;
    }
  >;
  modelVersionStats: Record<
    string,
    {
      total: number;
      approved: number;
      avgAccuracy: number | string | null;
      avgCorrections: number | string | null;
    }
  >;
  accuracyDistribution: {
    perfect: number;
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  fieldCorrectionStats: Record<string, number>;
  lowAccuracyReceipts: Array<{
    id: string;
    accuracy: number | string;
    correctionsMade: number;
    ocrMethod: string;
    modelVersion: string;
    submittedAt: string;
  }>;
}

// Helper function to safely format numbers that might be strings
const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) : value;
};

const OcrAnalytics = () => {
  const [analytics, setAnalytics] = useState<OcrAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFilter.dateFrom) params.append("dateFrom", dateFilter.dateFrom);
      if (dateFilter.dateTo) params.append("dateTo", dateFilter.dateTo);

      const data = await getOcrAnalytics(params.toString());
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch OCR analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = () => {
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Failed to load analytics</p>
      </div>
    );
  }

  // Prepare chart data
  const fieldCorrectionChartData = Object.entries(analytics.fieldCorrectionStats).map(
    ([field, count]) => ({
      field: field.toUpperCase(),
      corrections: count,
    })
  );

  const methodChartData = Object.entries(analytics.methodStats)
    .filter(([_, stats]) => stats.total > 0)
    .map(([method, stats]) => ({
      method: method.toUpperCase(),
      total: stats.total,
      approved: stats.approved,
      rejected: stats.rejected,
      pending: stats.pending,
      accuracy: stats.avgAccuracy || 0,
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">OCR Analytics</h1>
          <p className="text-gray-600 mt-1">
            Claude AI receipt recognition performance & training insights
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateFilter.dateFrom}
            onChange={(e) =>
              setDateFilter({ ...dateFilter, dateFrom: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-md"
            placeholder="From"
          />
          <input
            type="date"
            value={dateFilter.dateTo}
            onChange={(e) =>
              setDateFilter({ ...dateFilter, dateTo: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-md"
            placeholder="To"
          />
          <button
            onClick={applyDateFilter}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Receipts</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.overview.totalReceipts}
              </p>
            </div>
            <DocumentTextIcon className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {analytics.overview.totalApproved}
              </p>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">With Accuracy Data</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.overview.totalWithAccuracy}
              </p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Accuracy</p>
              <p className="text-2xl font-bold text-blue-600">
                {analytics.overview.avgAccuracy !== null
                  ? `${toNumber(analytics.overview.avgAccuracy).toFixed(1)}%`
                  : "N/A"}
              </p>
            </div>
            <CpuChipIcon className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Corrections</p>
              <p className="text-2xl font-bold text-orange-600">
                {analytics.overview.avgCorrections !== null
                  ? toNumber(analytics.overview.avgCorrections).toFixed(2)
                  : "N/A"}
              </p>
            </div>
            <XCircleIcon className="h-12 w-12 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Field Corrections Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Most Corrected Fields
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={fieldCorrectionChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="field" />
            <YAxis />
            <RechartsTooltip />
            <Bar dataKey="corrections" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row 2: Method Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          OCR Method Performance
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={methodChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="method" />
            <YAxis yAxisId="left" orientation="left" />
            <YAxis yAxisId="right" orientation="right" />
            <RechartsTooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="total" fill="#8b5cf6" name="Total" />
            <Bar yAxisId="left" dataKey="approved" fill="#10b981" name="Approved" />
            <Bar yAxisId="left" dataKey="rejected" fill="#ef4444" name="Rejected" />
            <Bar yAxisId="left" dataKey="pending" fill="#f59e0b" name="Pending" />
            <Bar
              yAxisId="right"
              dataKey="accuracy"
              fill="#3b82f6"
              name="Avg Accuracy %"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Model Version Stats */}
      {Object.keys(analytics.modelVersionStats).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Claude Model Versions
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Model Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Approved
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Accuracy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Corrections
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(analytics.modelVersionStats).map(
                  ([version, stats]) => (
                    <tr key={version}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {version}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stats.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stats.approved}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stats.avgAccuracy !== null
                          ? `${toNumber(stats.avgAccuracy).toFixed(1)}%`
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stats.avgCorrections !== null
                          ? toNumber(stats.avgCorrections).toFixed(2)
                          : "N/A"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low Accuracy Receipts */}
      {analytics.lowAccuracyReceipts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Recent Low Accuracy Receipts (&lt;80%)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Receipt ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Accuracy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Corrections
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    OCR Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.lowAccuracyReceipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      <a href={`/receipts/${receipt.id}`}>{receipt.id.slice(0, 8)}...</a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          toNumber(receipt.accuracy) >= 70
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {toNumber(receipt.accuracy).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.correctionsMade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.ocrMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.modelVersion || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(receipt.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OcrAnalytics;

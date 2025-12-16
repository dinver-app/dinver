import { useEffect, useState } from "react";
import {
  getGoogleApiLogsSummary,
  getRecentGoogleApiLogs,
  getFailedGoogleApiLogs,
} from "../services/googleApiLogsService";
import {
  CurrencyDollarIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface GoogleApiLogsSummary {
  period: {
    start: string;
    end: string;
  };
  total: {
    calls: number;
    cost: number;
  };
  byApiType: Array<{
    apiType: string;
    callCount: number;
    totalCost: number;
  }>;
  byTrigger: Array<{
    triggeredBy: string;
    callCount: number;
    totalCost: number;
  }>;
  dailyCosts: Array<{
    date: string;
    callCount: number;
    totalCost: number;
  }>;
  byCountry: Array<{
    country: string;
    callCount: number;
    totalCost: number;
  }>;
}

interface GoogleApiLog {
  id: string;
  apiType: string;
  latitude: number;
  longitude: number;
  place: string | null;
  country: string | null;
  query: string | null;
  radiusMeters: number | null;
  resultsCount: number;
  importedCount: number;
  costUsd: number;
  triggeredBy: string;
  triggerReason: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

const GoogleApiLogs = () => {
  const [summary, setSummary] = useState<GoogleApiLogsSummary | null>(null);
  const [recentLogs, setRecentLogs] = useState<GoogleApiLog[]>([]);
  const [failedLogs, setFailedLogs] = useState<GoogleApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, recentData, failedData] = await Promise.all([
        getGoogleApiLogsSummary(dateRange.start, dateRange.end),
        getRecentGoogleApiLogs(1, 50),
        getFailedGoogleApiLogs(),
      ]);

      setSummary(summaryData);
      setRecentLogs(recentData.logs);
      setFailedLogs(failedData.failedLogs);
    } catch (error) {
      console.error("Error loading Google API logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Google Places API Usage & Costs
        </h1>
        <p className="text-gray-600 mt-2">
          Monitor Google Places API calls, costs, and usage patterns
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <CalendarIcon className="h-5 w-5 text-gray-500" />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="border rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="border rounded px-3 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={loadData}
            className="ml-auto flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Calls</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {summary.total.calls.toLocaleString()}
              </p>
            </div>
            <CloudIcon className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                ${summary.total.cost.toFixed(2)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed Calls</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {failedLogs.length}
              </p>
            </div>
            <ExclamationTriangleIcon className="h-12 w-12 text-red-600" />
          </div>
        </div>
      </div>

      {/* Daily Costs Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Daily API Calls & Costs
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={summary.dailyCosts.reverse()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="callCount"
              stroke="#3B82F6"
              name="Calls"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalCost"
              stroke="#10B981"
              name="Cost ($)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* API Type & Trigger Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* By API Type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">By API Type</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={summary.byApiType}
                dataKey="totalCost"
                nameKey="apiType"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.apiType}: $${entry.totalCost.toFixed(2)}`}
              >
                {summary.byApiType.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By Trigger */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            By Trigger Source
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={summary.byTrigger}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="triggeredBy" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalCost" fill="#3B82F6" name="Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Countries */}
      {summary.byCountry.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Top Countries by Cost
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.byCountry.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.country}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.callCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      ${item.totalCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent API Calls</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  API Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trigger
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Query
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Results
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.apiType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.triggeredBy}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.query || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.resultsCount} ({log.importedCount} imported)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ${Number(log.costUsd).toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.success ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Success
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GoogleApiLogs;

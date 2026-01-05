import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ShoppingBagIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  SparklesIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  getReceiptAnalytics,
  ReceiptAnalyticsResponse,
} from "../services/receiptService";
import { getRestaurantsList } from "../services/restaurantService";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

const ALL_RESTAURANTS: Restaurant = {
  id: "all",
  name: "🌍 All Restaurants (Global)",
  slug: "all",
};

const ReceiptAnalytics = () => {
  const [analytics, setAnalytics] = useState<ReceiptAnalyticsResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(ALL_RESTAURANTS); // Default to global view
  const [showRestaurantDropdown, setShowRestaurantDropdown] = useState(false);
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [dateFilter, setDateFilter] = useState({
    dateFrom: "",
    dateTo: "",
  });

  // Fetch restaurants on mount
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const data = await getRestaurantsList();
        setRestaurants(data || []);
      } catch (error) {
        console.error("Failed to fetch restaurants:", error);
      }
    };
    fetchRestaurants();
  }, []);

  // Fetch analytics on mount (global view) and when restaurant changes
  useEffect(() => {
    if (selectedRestaurant) {
      fetchAnalytics();
    }
  }, [selectedRestaurant]);

  const fetchAnalytics = async () => {
    if (!selectedRestaurant) return;

    try {
      setLoading(true);
      const data = await getReceiptAnalytics(
        selectedRestaurant.id,
        dateFilter.dateFrom,
        dateFilter.dateTo
      );
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch receipt analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = () => {
    if (selectedRestaurant) {
      fetchAnalytics();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".restaurant-dropdown")) {
        setShowRestaurantDropdown(false);
      }
    };

    if (showRestaurantDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showRestaurantDropdown]);

  // Filter restaurants based on search
  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(restaurantSearch.toLowerCase())
  );

  // Prepare chart data
  const topItemsChartData = analytics?.topItems.slice(0, 10).map((item) => ({
    name: item.name.length > 20 ? item.name.slice(0, 20) + "..." : item.name,
    count: item.count,
    revenue: item.revenue,
  }));

  const priceDistributionChartData = analytics
    ? Object.entries(analytics.priceDistribution).map(([range, count]) => ({
        range,
        count,
      }))
    : [];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const dailyTrendsData = analytics?.dailyTrends.slice(-30); // Last 30 days

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Receipt Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Business insights about items sold per restaurant
          </p>
        </div>
      </div>

      {/* Restaurant Picker & Date Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Restaurant Picker */}
          <div className="relative restaurant-dropdown flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Restaurant
            </label>
            <button
              onClick={() => setShowRestaurantDropdown(!showRestaurantDropdown)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="truncate">
                {selectedRestaurant
                  ? selectedRestaurant.name
                  : "Choose a restaurant"}
              </span>
              <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0" />
            </button>
            {showRestaurantDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                  <input
                    type="text"
                    placeholder="Search restaurants..."
                    value={restaurantSearch}
                    onChange={(e) => setRestaurantSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="py-1">
                  {/* All Restaurants Option */}
                  <button
                    onClick={() => {
                      setSelectedRestaurant(ALL_RESTAURANTS);
                      setShowRestaurantDropdown(false);
                      setRestaurantSearch("");
                    }}
                    className={`w-full text-left px-3 py-2 text-sm font-semibold hover:bg-gray-100 border-b border-gray-200 ${
                      selectedRestaurant?.id === "all"
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-900"
                    }`}
                  >
                    {ALL_RESTAURANTS.name}
                  </button>

                  {/* Individual Restaurants */}
                  {filteredRestaurants.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No restaurants found
                    </div>
                  ) : (
                    filteredRestaurants.map((restaurant) => (
                      <button
                        key={restaurant.id}
                        onClick={() => {
                          setSelectedRestaurant(restaurant);
                          setShowRestaurantDropdown(false);
                          setRestaurantSearch("");
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                          selectedRestaurant?.id === restaurant.id
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-900"
                        }`}
                      >
                        {restaurant.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Date Filters */}
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From
              </label>
              <input
                type="date"
                value={dateFilter.dateFrom}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, dateFrom: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <input
                type="date"
                value={dateFilter.dateTo}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, dateTo: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={applyDateFilter}
              disabled={!selectedRestaurant}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Analytics Content */}
      {!loading && analytics && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.overview.totalItems}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg: {analytics.overview.avgItemsPerReceipt} per receipt
                  </p>
                </div>
                <ShoppingBagIcon className="h-12 w-12 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    €{analytics.overview.totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg: €{analytics.overview.avgRevenuePerReceipt.toFixed(2)}{" "}
                    per receipt
                  </p>
                </div>
                <CurrencyEuroIcon className="h-12 w-12 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unique Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.overview.uniqueItems}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Different menu items
                  </p>
                </div>
                <SparklesIcon className="h-12 w-12 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Charts Row 1: Top Items & Price Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Items Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Top 10 Items
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topItemsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Quantity Sold" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Price Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Price Distribution (Items Sold)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priceDistributionChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ range, count }) => `${range}€: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {priceDistributionChartData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trends Chart */}
          {dailyTrendsData && dailyTrendsData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Daily Trends (Last 30 Days)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="items"
                    stroke="#3b82f6"
                    name="Items Sold"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    name="Revenue (€)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Items Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Top Items Details
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity Sold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Avg Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      First Seen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Seen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.topItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.count}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        €{item.revenue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        €{item.avgPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.firstSeen}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.lastSeen}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReceiptAnalytics;

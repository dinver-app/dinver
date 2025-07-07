import { useEffect, useState } from "react";
import { getAnalyticsSummary } from "../services/analyticsService";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  EyeIcon,
  CursorArrowRaysIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  FunnelIcon,
  TableCellsIcon,
  ArrowPathIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/solid";
import { useTranslation } from "react-i18next";

// Types
interface AnalyticsSummary {
  periods: string[];
  events: Record<string, EventSummary>;
  itemClicks: ItemClick[];
  topItems: ItemClick[];
  sourceBreakdown: Record<string, number>;
  sourceBreakdownUnique: Record<string, number>;
  sourceByEvent: Record<string, Record<string, number>>;
  sourceByEventUnique: Record<string, Record<string, number>>;
  byHour: Record<string, number[]>;
  byHourUnique: Record<string, number[]>;
  byHourSource?: Record<string, Record<string, number[]>>;
  byHourSourceUnique?: Record<string, Record<string, number[]>>;
  clicksTotal: number;
  viewsTotal: number;
  byDate: Record<string, number>;
  byDateUnique: Record<string, number>;
  confirmedVisits: number;
  qrScansTotal: number;
  itemClicksBySource?: Record<
    string,
    Record<
      string,
      {
        total: Record<string, number>;
        unique: Record<string, number>;
      }
    >
  >;
  confirmedVisitsSummary?: {
    total: Record<string, number>;
    change: Record<string, number>;
  };
  qrScansSummary?: {
    total: Record<string, number>;
    change: Record<string, number>;
  };
}

interface EventSummary {
  total: Record<string, number>;
  unique: Record<string, number>;
  changeToday: number;
  change7: number;
  change30: number;
  uniqueChangeToday: number;
  uniqueChange7: number;
  uniqueChange30: number;
}

interface ItemClick {
  id: string;
  name: string;
  total: Record<string, number>;
  unique: Record<string, number>;
}

type PeriodKey =
  | "today"
  | "last7"
  | "last14"
  | "last30"
  | "last60"
  | "all_time";

const Analytics = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("last7");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [showUniqueData, setShowUniqueData] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshInterval, _] = useState(30); // seconds

  const restaurantId =
    JSON.parse(localStorage.getItem("currentRestaurant") || "{}")?.id || "";

  // Constants (moraju biti unutar komponente zbog t)
  const PERIOD_LABELS: Record<string, string> = {
    today: t("period_today"),
    last7: t("period_last7"),
    last14: t("period_last14"),
    last30: t("period_last30"),
    last60: t("period_last60"),
    all_time: t("period_all_time"),
  };

  const EVENT_TYPES = {
    restaurant_view: {
      label: t("event_restaurant_view"),
      icon: EyeIcon,
      color: "bg-blue-500",
    },
    click_gallery: {
      label: t("event_click_gallery"),
      icon: ChartBarIcon,
      color: "bg-green-500",
    },
    click_reviews: {
      label: t("event_click_reviews"),
      icon: ChartBarIcon,
      color: "bg-purple-500",
    },
    click_reserve: {
      label: t("event_click_reserve"),
      icon: CalendarDaysIcon,
      color: "bg-orange-500",
    },
    click_menu: {
      label: t("event_click_menu"),
      icon: ChartBarIcon,
      color: "bg-red-500",
    },
    click_menu_item: {
      label: t("event_click_menu_item"),
      icon: CursorArrowRaysIcon,
      color: "bg-yellow-500",
    },
    click_phone: {
      label: t("event_click_phone"),
      icon: ChartBarIcon,
      color: "bg-indigo-500",
    },
    click_map: {
      label: t("event_click_map"),
      icon: ChartBarIcon,
      color: "bg-pink-500",
    },
    click_website: {
      label: t("event_click_website"),
      icon: ChartBarIcon,
      color: "bg-teal-500",
    },
  };

  const CHART_COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#EC4899",
    "#6366F1",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getAnalyticsSummary(restaurantId);
        setData(response);

        // Initialize source filter with all sources (only on first load)
        if (selectedSources.length === 0) {
          const sources = Object.keys(response.sourceBreakdown || {});
          setSelectedSources(sources);
        }
      } catch (err) {
        setError("Greška pri dohvaćanju podataka");
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      fetchData();
    }
  }, [restaurantId]);

  // Auto-refresh effect
  useEffect(() => {
    if (!isAutoRefresh || !restaurantId) return;

    const interval = setInterval(async () => {
      try {
        const response = await getAnalyticsSummary(restaurantId);
        setData(response);
      } catch (err) {
        console.error("Auto-refresh failed:", err);
      }
    }, refreshInterval * 1000); // Convert seconds to milliseconds

    return () => clearInterval(interval);
  }, [isAutoRefresh, restaurantId, refreshInterval]);

  // Helper function to filter data by selected sources
  const getFilteredData = (): AnalyticsSummary | null => {
    if (!data || selectedSources.length === 0) return data;

    // 1. Filter sourceBreakdown
    const filteredSourceBreakdown = Object.entries(data.sourceBreakdown)
      .filter(([source]) => selectedSources.includes(source))
      .reduce(
        (acc: Record<string, number>, [source, count]) => ({
          ...acc,
          [source]: count,
        }),
        {}
      );

    // 2. Filter sourceByEvent
    const filteredSourceByEvent = Object.entries(data.sourceByEvent).reduce(
      (acc: Record<string, Record<string, number>>, [eventType, sources]) => {
        const filteredSources = Object.entries(sources)
          .filter(([source]) => selectedSources.includes(source))
          .reduce(
            (acc2: Record<string, number>, [source, count]) => ({
              ...acc2,
              [source]: count,
            }),
            {}
          );
        return { ...acc, [eventType]: filteredSources };
      },
      {}
    );

    // 3. Recalculate events (overview)
    const filteredEvents: Record<string, EventSummary> = {};
    for (const [eventType, event] of Object.entries(data.events)) {
      // For each period, sum only sources in selectedSources
      const total: Record<string, number> = {};
      const unique: Record<string, number> = {};
      for (const period of Object.keys(event.total)) {
        // Sum all sources for this eventType and period
        const sources = data.sourceByEvent[eventType] || {};
        const filteredTotal = Object.entries(sources)
          .filter(([source]) => selectedSources.includes(source))
          .reduce((sum, [, count]) => sum + count, 0);
        total[period] = filteredTotal;
        // Unique: fallback to original unique (since we don't have unique per source)
        // If you want to recalc unique per source, you need backend support
        unique[period] = event.unique[period];
      }
      filteredEvents[eventType] = {
        ...event,
        total,
        unique,
      };
    }

    // 4. Recalculate topItems (menu items) using itemClicksBySource
    let filteredTopItems: typeof data.topItems = [];
    if (data.itemClicksBySource) {
      filteredTopItems = data.topItems.map((item) => {
        const total: Record<string, number> = {};
        const unique: Record<string, number> = {};
        for (const period of Object.keys(item.total)) {
          let totalSum = 0;
          let uniqueSum = 0;
          const itemSources = data.itemClicksBySource?.[item.id];
          if (itemSources) {
            for (const source of selectedSources) {
              const sourceData = itemSources[source];
              totalSum += sourceData?.total?.[period] ?? 0;
              uniqueSum += sourceData?.unique?.[period] ?? 0;
            }
          }
          total[period] = totalSum;
          unique[period] = uniqueSum;
        }
        return { ...item, total, unique };
      });
      // Sort by selected period total desc (like backend)
      filteredTopItems = [...filteredTopItems]
        .sort(
          (a, b) =>
            (b.total[selectedPeriod] || 0) - (a.total[selectedPeriod] || 0)
        )
        .slice(0, 5);
    } else {
      filteredTopItems = data.topItems;
    }

    // 5. Recalculate clicksTotal
    const clicksTotal = Object.values(filteredSourceBreakdown).reduce(
      (sum: number, count: number) => sum + count,
      0
    );

    return {
      ...data,
      sourceBreakdown: filteredSourceBreakdown,
      sourceByEvent: filteredSourceByEvent,
      events: filteredEvents,
      topItems: filteredTopItems,
      clicksTotal,
    };
  };

  const TrendIndicator = ({
    value,
    className = "",
  }: {
    value: number;
    className?: string;
  }) => {
    // Ne prikazuj trendove za all_time period
    if (selectedPeriod === "all_time") {
      return null;
    }

    if (value === 0)
      return <span className={`text-gray-400 ${className}`}>0%</span>;

    const isPositive = value > 0;
    const Icon = isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
    const colorClass = isPositive ? "text-green-600" : "text-red-600";

    return (
      <div className={`flex items-center gap-1 ${colorClass} ${className}`}>
        <Icon className="w-4 h-4" />
        <span className="font-medium">{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  };

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    color,
    subtitle,
  }: {
    title: string;
    value: number;
    change: number;
    icon: any;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace("bg-", "text-")}`} />
        </div>
        <TrendIndicator value={change} className="text-sm" />
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-gray-900">
          {value.toLocaleString()}
        </h3>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );

  // Helper: Calculate breakdown by source for a given event type and period
  const getSourceBreakdown = (eventType: string) => {
    if (!data) return {};
    const breakdown: Record<string, number> = {};
    const sources = Object.keys(data.sourceBreakdown);

    for (const source of sources) {
      if (showUniqueData) {
        // Unique: use backend calculated unique values
        if (eventType === "all") {
          breakdown[source] = data.sourceBreakdownUnique[source] || 0;
        } else {
          breakdown[source] =
            data.sourceByEventUnique[eventType]?.[source] || 0;
        }
      } else {
        // Total: use backend calculated total values
        if (eventType === "all") {
          breakdown[source] = data.sourceBreakdown[source] || 0;
        } else {
          breakdown[source] = data.sourceByEvent[eventType]?.[source] || 0;
        }
      }
    }
    return breakdown;
  };

  // Helper: Check if a timestamp is in the selected period
  const isInPeriod = (timestamp: string, period: PeriodKey) => {
    const date = new Date(timestamp);
    const now = new Date();
    if (period === "today") {
      return date.toDateString() === now.toDateString();
    } else if (period === "last7") {
      return (now.getTime() - date.getTime()) / 86400000 < 7;
    } else if (period === "last14") {
      return (now.getTime() - date.getTime()) / 86400000 < 14;
    } else if (period === "last30") {
      return (now.getTime() - date.getTime()) / 86400000 < 30;
    } else if (period === "last60") {
      return (now.getTime() - date.getTime()) / 86400000 < 60;
    } else if (period === "all_time") {
      return true; // Uvijek true za sve datume
    }
    return false;
  };

  // Helper: Hourly data (views/clicks) for unique/total
  const getHourlyData = () => {
    if (!data) return [];
    return Array.from({ length: 24 }, (_, hour) => {
      let views = 0;
      let clicks = 0;

      if (showUniqueData && data.byHourSourceUnique) {
        // Unique: sum byHourSourceUnique for selected sources
        for (const source of selectedSources) {
          views +=
            data.byHourSourceUnique.restaurant_view?.[source]?.[hour] || 0;
          for (const [eventType, sourceObj] of Object.entries(
            data.byHourSourceUnique
          )) {
            if (eventType.startsWith("click_")) {
              clicks += sourceObj?.[source]?.[hour] || 0;
            }
          }
        }
      } else if (data.byHourSource) {
        // Total: sum byHourSource for selected sources
        for (const source of selectedSources) {
          views += data.byHourSource.restaurant_view?.[source]?.[hour] || 0;
          for (const [eventType, sourceObj] of Object.entries(
            data.byHourSource
          )) {
            if (eventType.startsWith("click_")) {
              clicks += sourceObj?.[source]?.[hour] || 0;
            }
          }
        }
      } else {
        // Fallback to byHour data
        if (showUniqueData) {
          views = data.byHourUnique.restaurant_view?.[hour] || 0;
          clicks = Object.entries(data.byHourUnique)
            .filter(([key]) => key.startsWith("click_"))
            .reduce((sum, [, hours]) => sum + (hours[hour] || 0), 0);
        } else {
          views = filteredData.byHour.restaurant_view?.[hour] || 0;
          clicks = Object.entries(filteredData.byHour)
            .filter(([key]) => key.startsWith("click_"))
            .reduce((sum, [, hours]) => sum + (hours[hour] || 0), 0);
        }
      }

      return {
        hour: `${hour}:00`,
        views,
        clicks,
      };
    });
  };

  // Helper: Daily trend (unique/total)
  const getDailyData = () => {
    if (!data) return [];

    // Use byDate data from backend
    const byDay = showUniqueData ? data.byDateUnique : data.byDate;
    const sortedDays = Object.entries(byDay || {}).sort(
      ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
    );

    // For all_time, show last 30 days, for other periods show all days in period
    const daysToShow = selectedPeriod === "all_time" ? 30 : undefined;
    const slicedDays = daysToShow ? sortedDays.slice(-daysToShow) : sortedDays;

    return slicedDays.map(([date, value]) => ({
      date: new Date(date).toLocaleDateString("hr-HR", {
        month: "short",
        day: "numeric",
      }),
      count: value as number,
    }));
  };

  // Helper: Source by event heatmap (unique/total)
  const getSourceByEventData = () => {
    if (!data) return [];
    return Object.entries(EVENT_TYPES)
      .map(([eventType, config]) => {
        const sources = Object.keys(data.sourceBreakdown);
        const row: Record<string, number> = {};
        for (const source of sources) {
          if (showUniqueData) {
            row[source] = data.sourceByEventUnique[eventType]?.[source] || 0;
          } else {
            row[source] = data.sourceByEvent[eventType]?.[source] || 0;
          }
        }
        return {
          eventType,
          label: config.label,
          sources: row,
        };
      })
      .filter((item) => Object.keys(item.sources).length > 0);
  };

  // Helper: Get KPI values based on selected period and unique/total toggle
  const getKPIValues = () => {
    if (!data) return { views: 0, clicks: 0, visits: 0, qrScans: 0 };

    let views = 0;
    let clicks = 0;
    let visits = 0;
    let qrScans = 0;

    if (showUniqueData) {
      // Unique values for selected period from backend aggregates
      views = data.events.restaurant_view?.unique[selectedPeriod] || 0;
      clicks = Object.entries(data.events)
        .filter(([key]) => key.startsWith("click_"))
        .reduce(
          (sum, [, event]) => sum + (event.unique[selectedPeriod] || 0),
          0
        );
      qrScans = data.qrScansSummary?.total?.[selectedPeriod] || 0; // If you want unique QR scans, add a backend field
    } else {
      // Total values for selected period from backend aggregates
      views = data.events.restaurant_view?.total[selectedPeriod] || 0;
      clicks = Object.entries(data.events)
        .filter(([key]) => key.startsWith("click_"))
        .reduce(
          (sum, [, event]) => sum + (event.total[selectedPeriod] || 0),
          0
        );
      qrScans = data.qrScansSummary?.total?.[selectedPeriod] || 0;
    }

    // For visits, use the backend calculated values
    visits = data.confirmedVisitsSummary?.total?.[selectedPeriod] || 0;

    return { views, clicks, visits, qrScans };
  };

  // Helper: Get KPI change values based on selected period
  const getKPIChanges = () => {
    if (!data) return { views: 0, clicks: 0, visits: 0, qrScans: 0 };

    // Za all_time period ne prikazujemo trendove
    if (selectedPeriod === "all_time") {
      return { views: 0, clicks: 0, visits: 0, qrScans: 0 };
    }

    // Backend trenutno vraća samo changeToday, change7, change30 i uniqueChangeToday, uniqueChange7, uniqueChange30
    // Za ostale periode koristimo fallback
    let changeKey;
    if (showUniqueData) {
      if (selectedPeriod === "today") changeKey = "uniqueChangeToday";
      else if (selectedPeriod === "last7") changeKey = "uniqueChange7";
      else if (selectedPeriod === "last30") changeKey = "uniqueChange30";
      else changeKey = "uniqueChange7"; // fallback za last14, last60, all_time
    } else {
      if (selectedPeriod === "today") changeKey = "changeToday";
      else if (selectedPeriod === "last7") changeKey = "change7";
      else if (selectedPeriod === "last30") changeKey = "change30";
      else changeKey = "change7"; // fallback za last14, last60, all_time
    }

    const views =
      (data.events.restaurant_view?.[
        changeKey as keyof EventSummary
      ] as number) || 0;
    const clicks = getClickEventsChange();
    const visits = data.confirmedVisitsSummary?.change?.[selectedPeriod] ?? 0;
    const qrScans = data.qrScansSummary?.change?.[selectedPeriod] ?? 0;

    return { views, clicks, visits, qrScans };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("loading_analytics")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("try_again")}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const filteredData = getFilteredData()!;
  const availableSources = Object.keys(data.sourceBreakdown);
  const pieChartData = Object.entries(getSourceBreakdown("all")).map(
    ([name, value]) => ({
      name,
      value,
      percentage:
        filteredData.clicksTotal > 0
          ? ((value / filteredData.clicksTotal) * 100).toFixed(1)
          : "0",
    })
  );

  const hourlyData = getHourlyData();

  const dailyData = getDailyData();

  const sourceByEventData = getSourceByEventData();

  const getClickEventsChange = () => {
    // Za all_time period ne prikazujemo trendove
    if (selectedPeriod === "all_time") {
      return 0;
    }

    const clickEvents = Object.entries(data.events).filter(([key]) =>
      key.startsWith("click_")
    );
    return clickEvents.length > 0
      ? clickEvents.reduce((sum, [, event]) => {
          // Backend trenutno vraća samo changeToday, change7, change30 i uniqueChangeToday, uniqueChange7, uniqueChange30
          // Za ostale periode koristimo fallback
          let changeKey;
          if (showUniqueData) {
            if (selectedPeriod === "today") changeKey = "uniqueChangeToday";
            else if (selectedPeriod === "last7") changeKey = "uniqueChange7";
            else if (selectedPeriod === "last30") changeKey = "uniqueChange30";
            else changeKey = "uniqueChange7"; // fallback za last14, last60, all_time
          } else {
            if (selectedPeriod === "today") changeKey = "changeToday";
            else if (selectedPeriod === "last7") changeKey = "change7";
            else if (selectedPeriod === "last30") changeKey = "change30";
            else changeKey = "change7"; // fallback za last14, last60, all_time
          }
          return (
            sum + ((event[changeKey as keyof EventSummary] as number) || 0)
          );
        }, 0) / clickEvents.length
      : 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("analytics_dashboard")}
              </h1>
              <p className="mt-2 text-gray-600">
                {t("analytics_dashboard_subtitle")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Manual Refresh Button */}
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const response = await getAnalyticsSummary(restaurantId);
                      setData(response);
                    } catch (err) {
                      setError("Greška pri ručnom osvježavanju");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    loading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-600 hover:bg-gray-50 border-gray-300"
                  }`}
                  title={t("manual_refresh")}
                >
                  <ArrowPathIcon
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  <span className="text-sm">{t("refresh")}</span>
                </button>
                {/* Auto-refresh Toggle */}
                <div className="flex items-center gap-2">
                  <ArrowPathIcon
                    className={`w-5 h-5 transition-all duration-300 ${
                      isAutoRefresh ? "text-green-500" : "text-gray-500"
                    } ${isAutoRefresh && !loading ? "animate-pulse" : ""}`}
                  />
                  <button
                    type="button"
                    aria-pressed={isAutoRefresh}
                    onClick={() => setIsAutoRefresh((v) => !v)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isAutoRefresh ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isAutoRefresh ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-700 select-none">
                    {t("auto_refresh")}
                  </span>
                </div>
                {/* Unique vs Total Toggle */}
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-gray-500" />
                  <button
                    type="button"
                    aria-pressed={showUniqueData}
                    onClick={() => setShowUniqueData((v) => !v)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0 ${
                      showUniqueData ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        showUniqueData ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span
                    className={`block text-xs text-center font-medium transition-colors duration-200 w-16 ${
                      showUniqueData ? "text-blue-600" : "text-gray-500"
                    }`}
                  >
                    {showUniqueData ? t("unique") : t("total")}
                  </span>
                </div>
                {/* Period Filter */}
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5 text-gray-500" />
                  <select
                    value={selectedPeriod}
                    onChange={(e) =>
                      setSelectedPeriod(e.target.value as PeriodKey)
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {data.periods.map((period) => (
                      <option key={period} value={period}>
                        {PERIOD_LABELS[period] || period}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Source Filter */}
                <div className="flex items-center gap-2">
                  <FunnelIcon className="w-5 h-5 text-gray-500" />
                  <div className="flex gap-2">
                    {availableSources.map((source) => (
                      <button
                        key={source}
                        onClick={() => {
                          if (selectedSources.includes(source)) {
                            if (selectedSources.length > 1) {
                              setSelectedSources(
                                selectedSources.filter((s) => s !== source)
                              );
                            }
                          } else {
                            setSelectedSources([...selectedSources, source]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          selectedSources.includes(source)
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-100 text-gray-700 border border-gray-300"
                        }`}
                      >
                        {source}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Data Mode Info */}
        <div
          className={`border rounded-lg p-4 mb-6 flex items-center gap-2 ${
            showUniqueData
              ? "bg-blue-50 border-blue-200"
              : "bg-white border-gray-200"
          }`}
        >
          <UserGroupIcon
            className={`w-5 h-5 ${
              showUniqueData ? "text-blue-600" : "text-gray-400"
            }`}
          />
          <span
            className={`px-3 py-1 rounded-lg font-medium text-sm transition-colors duration-200 ${
              showUniqueData
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {showUniqueData ? t("unique_data_mode") : t("total_data_mode")}
          </span>
          <span
            className={`text-xs ${
              showUniqueData ? "text-blue-700" : "text-gray-500"
            }`}
          >
            {showUniqueData
              ? t("unique_data_description")
              : t("total_data_description")}
          </span>
        </div>

        {/* Source Filter Info */}
        {selectedSources.length < availableSources.length && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-blue-600" />
              <p className="text-blue-800">
                {t("showing_data_for_sources")}:{" "}
                <strong>{selectedSources.join(", ")}</strong>
              </p>
              <button
                onClick={() => setSelectedSources(availableSources)}
                className="ml-auto text-blue-600 hover:text-blue-800 underline text-sm"
              >
                {t("show_all")}
              </button>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t("total_views")}
            value={getKPIValues().views}
            change={getKPIChanges().views}
            icon={EyeIcon}
            color="bg-blue-500"
            subtitle={t("all_profile_views")}
          />
          <StatCard
            title={t("total_clicks")}
            value={getKPIValues().clicks}
            change={getKPIChanges().clicks}
            icon={CursorArrowRaysIcon}
            color="bg-green-500"
            subtitle={t("all_interactions")}
          />
          <StatCard
            title={t("total_visits")}
            value={getKPIValues().visits}
            change={getKPIChanges().visits}
            icon={UserGroupIcon}
            color="bg-indigo-500"
            subtitle={t("all_confirmed_visits")}
          />
          <StatCard
            title={t("total_qr_scans")}
            value={getKPIValues().qrScans}
            change={getKPIChanges().qrScans}
            icon={ChartBarIcon}
            color="bg-yellow-500"
            subtitle={t("all_qr_scans")}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Source Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("source_distribution")}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => [`${value} klikova`, "Broj"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hourly Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("hourly_activity")}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#3B82F6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient
                      id="colorClicks"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#10B981"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stackId="1"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    name="Pregledi"
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stackId="1"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorClicks)"
                    name="Klikovi"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Daily Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("daily_activity_trend")}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  formatter={(value: any) => [`${value} aktivnosti`, "Broj"]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source by Event Heatmap */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <TableCellsIcon className="w-6 h-6 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t("source_event_heatmap")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    {t("event_type")}
                  </th>
                  {selectedSources.map((source) => (
                    <th
                      key={source}
                      className="text-center py-3 px-4 font-medium text-gray-900"
                    >
                      {source}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sourceByEventData.map((row) => (
                  <tr
                    key={row.eventType}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {row.label}
                    </td>
                    {selectedSources.map((source) => {
                      const count = row.sources[source] || 0;
                      const maxCount = Math.max(...Object.values(row.sources));
                      const intensity =
                        maxCount > 0 ? (count / maxCount) * 100 : 0;
                      const bgColor =
                        intensity > 0
                          ? `rgba(59, 130, 246, ${intensity / 100})`
                          : "transparent";

                      return (
                        <td
                          key={source}
                          className="py-3 px-4 text-center relative"
                          style={{ backgroundColor: bgColor }}
                        >
                          <span
                            className={`font-semibold ${
                              intensity > 50 ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {count.toLocaleString()}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            💡 {t("darker_color_indicates_more_clicks")}
          </div>
        </div>

        {/* Event Types Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {t("event_type_views")}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className={!showUniqueData ? "font-semibold" : ""}>
                {t("total")}
              </span>
              <span>•</span>
              <span className={showUniqueData ? "font-semibold" : ""}>
                {t("unique")}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(EVENT_TYPES).map(([eventType, config]) => {
              const eventData = filteredData.events[eventType];
              if (!eventData) return null;

              const totalValue = eventData.total[selectedPeriod] || 0;
              const uniqueValue = eventData.unique[selectedPeriod] || 0;
              const mainValue = showUniqueData ? uniqueValue : totalValue;
              const secondaryValue = showUniqueData ? totalValue : uniqueValue;
              const mainLabel = showUniqueData ? t("unique") : t("total");
              const secondaryLabel = showUniqueData ? t("total") : t("unique");
              const trendValue = showUniqueData
                ? eventData.uniqueChange7
                : eventData.change7;

              return (
                <div
                  key={eventType}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${config.color} bg-opacity-10`}
                      >
                        <config.icon
                          className={`w-5 h-5 ${config.color.replace(
                            "bg-",
                            "text-"
                          )}`}
                        />
                      </div>
                      <h4 className="font-medium text-gray-900">
                        {config.label}
                      </h4>
                    </div>
                    <TrendIndicator value={trendValue} className="text-xs" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm text-black-600`}>
                        {mainLabel}:
                      </span>
                      <span
                        className={`font-bold text-2xl ${
                          showUniqueData ? "text-black-700" : "text-black-700"
                        }`}
                      >
                        {mainValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{secondaryLabel}:</span>
                      <span>{secondaryValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {t("top_menu_items")}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className={!showUniqueData ? "font-semibold" : ""}>
                {t("total")}
              </span>
              <span>•</span>
              <span className={showUniqueData ? "font-semibold" : ""}>
                {t("unique")}
              </span>
            </div>
          </div>
          {filteredData.topItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredData.topItems.map((item, index) => {
                const totalValue = item.total[selectedPeriod] || 0;
                const uniqueValue = item.unique[selectedPeriod] || 0;
                const mainValue = showUniqueData ? uniqueValue : totalValue;
                const secondaryValue = showUniqueData
                  ? totalValue
                  : uniqueValue;
                const mainLabel = showUniqueData ? t("unique") : t("total");
                const secondaryLabel = showUniqueData
                  ? t("total")
                  : t("unique");

                return (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <h4 className="font-medium text-gray-900 truncate">
                          {item.name}
                        </h4>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className={`text-black-600 font-medium`}>
                          {mainLabel}:
                        </span>
                        <span
                          className={`font-bold ${
                            showUniqueData ? "text-black-700" : "text-black-700"
                          }`}
                        >
                          {mainValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{secondaryLabel}:</span>
                        <span>{secondaryValue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">{t("no_data_clicks_menu_items")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;

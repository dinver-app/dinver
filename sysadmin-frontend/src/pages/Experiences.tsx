import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  PhotoIcon,
  StarIcon,
  MapPinIcon,
  UserIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import experienceService, { Experience } from "../services/experienceService";
import toast from "react-hot-toast";

const Experiences: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<
    "PENDING" | "APPROVED" | "REJECTED" | ""
  >("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedMealType, setSelectedMealType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // UI state
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, [
    selectedStatus,
    selectedCity,
    selectedMealType,
    searchQuery,
    dateFrom,
    dateTo,
    currentPage,
  ]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load stats (only once on mount)
      if (!stats) {
        const statsResponse = await experienceService.getExperienceStats();
        setStats(statsResponse.data);
      }

      // Load experiences with filters
      const response = await experienceService.getAllExperiences(
        selectedStatus || undefined,
        selectedCity || undefined,
        selectedMealType || undefined,
        dateFrom || undefined,
        dateTo || undefined,
        searchQuery || undefined,
        currentPage,
        limit
      );

      setExperiences(response.experiences);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error("Error loading experiences:", error);
      toast.error("Failed to load experiences");
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedStatus("");
    setSelectedCity("");
    setSelectedMealType("");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleViewExperience = (experienceId: string) => {
    navigate(`/experiences/${experienceId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMealTypeLabel = (mealType: string | undefined) => {
    if (!mealType) return "-";
    const labels: { [key: string]: string } = {
      breakfast: "🍳 Breakfast",
      brunch: "🥞 Brunch",
      lunch: "🍽️ Lunch",
      dinner: "🍷 Dinner",
      sweet: "🍰 Sweet",
      drinks: "🍹 Drinks",
    };
    return labels[mealType] || mealType;
  };

  const activeFiltersCount = [
    selectedStatus,
    selectedCity,
    selectedMealType,
    searchQuery,
    dateFrom,
    dateTo,
  ].filter((f) => f).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Experiences</h1>
        <p className="text-gray-600 mt-1">
          Manage and review user experiences
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <PhotoIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.statusBreakdown.APPROVED}
                </p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.statusBreakdown.PENDING}
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.statusBreakdown.REJECTED}
                </p>
              </div>
              <XMarkIcon className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showFilters ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 space-y-4">
            {/* Row 1: Status, City, Meal Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(
                      e.target.value as "PENDING" | "APPROVED" | "REJECTED" | ""
                    );
                    setCurrentPage(1);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Enter city name..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Meal Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Type
                </label>
                <select
                  value={selectedMealType}
                  onChange={(e) => {
                    setSelectedMealType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Meal Types</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="brunch">Brunch</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="sweet">Sweet</option>
                  <option value="drinks">Drinks</option>
                </select>
              </div>
            </div>

            {/* Row 2: Search and Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Description
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search in descriptions..."
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {activeFiltersCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {experiences.length} of {totalCount} experiences
      </div>

      {/* Experiences Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Loading experiences...</p>
        </div>
      ) : experiences.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No experiences found</p>
          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.map((experience) => (
            <div
              key={experience.id}
              onClick={() => handleViewExperience(experience.id)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
            >
              {/* Image */}
              {experience.media && experience.media.length > 0 && (
                <div className="aspect-video bg-gray-200 relative">
                  <img
                    src={experience.media[0].cdnUrl}
                    alt="Experience"
                    className="w-full h-full object-cover"
                  />
                  {experience.media.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                      +{experience.media.length - 1} more
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                {/* Status Badge */}
                <div className="mb-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(
                      experience.status
                    )}`}
                  >
                    {experience.status}
                  </span>
                </div>

                {/* Restaurant & User */}
                <div className="space-y-2 mb-3">
                  {experience.restaurant && (
                    <div className="flex items-start gap-2">
                      <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {experience.restaurant.name}
                        </div>
                        <div className="text-gray-500">
                          {experience.restaurant.city}
                        </div>
                      </div>
                    </div>
                  )}

                  {experience.author && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600">
                        {experience.author.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ratings */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                  <div className="text-center">
                    <div className="text-gray-500 text-xs">Food</div>
                    <div className="font-semibold flex items-center justify-center gap-1">
                      <StarIcon className="h-3 w-3 text-yellow-500" />
                      {experience.foodRating?.toFixed(1) || "-"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 text-xs">Ambience</div>
                    <div className="font-semibold flex items-center justify-center gap-1">
                      <StarIcon className="h-3 w-3 text-yellow-500" />
                      {experience.ambienceRating?.toFixed(1) || "-"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 text-xs">Service</div>
                    <div className="font-semibold flex items-center justify-center gap-1">
                      <StarIcon className="h-3 w-3 text-yellow-500" />
                      {experience.serviceRating?.toFixed(1) || "-"}
                    </div>
                  </div>
                </div>

                {/* Meal Type */}
                {experience.mealType && (
                  <div className="mb-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {getMealTypeLabel(experience.mealType)}
                    </span>
                  </div>
                )}

                {/* Description Preview */}
                {experience.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {experience.description}
                  </p>
                )}

                {/* Footer: Date & Engagement */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {new Date(
                      experience.publishedAt || experience.createdAt
                    ).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-3">
                    <span>❤️ {experience.likesCount || 0}</span>
                    <span>👁️ {experience.viewsCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow px-4 py-3">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Experiences;

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  restaurantAdminService,
  RestaurantLite,
} from "../services/restaurantAdminService";
import MapMini from "./MapMini";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (restaurant: RestaurantLite) => void;
  userLat?: number;
  userLng?: number;
}

const RestaurantPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelect,
  userLat,
  userLng,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"search" | "nearby">("search");
  const [query, setQuery] = useState("");
  const [_, setLoading] = useState(false);
  const [results, setResults] = useState<RestaurantLite[]>([]);
  const [nearby, setNearby] = useState<RestaurantLite[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    handleSearch();
  }, [isOpen]);

  // Re-run nearby when modal opens or coordinates change
  useEffect(() => {
    if (!isOpen) return;
    if (typeof userLat === "number" && typeof userLng === "number") {
      handleNearby();
    }
  }, [isOpen, userLat, userLng]);

  // If user switches to Nearby tab and coords exist, fetch nearby
  useEffect(() => {
    if (activeTab !== "nearby") return;
    if (typeof userLat === "number" && typeof userLng === "number") {
      handleNearby();
    }
  }, [activeTab, userLat, userLng]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      const res = await restaurantAdminService.search(query, 1, 20);
      setResults(res.restaurants);
    } finally {
      setLoading(false);
    }
  };

  const handleNearby = async () => {
    if (typeof userLat !== "number" || typeof userLng !== "number") return;
    try {
      setLoading(true);
      const res = await restaurantAdminService.nearby(
        userLat as number,
        userLng as number,
        1500,
        10
      );
      setNearby(res.restaurants);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-start justify-center p-6 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {t("picker.choose_restaurant")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="flex space-x-4 border-b">
            <button
              className={`pb-2 ${
                activeTab === "search"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600"
              }`}
              onClick={() => setActiveTab("search")}
            >
              {t("common.search")}
            </button>
            <button
              className={`pb-2 ${
                activeTab === "nearby"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600"
              }`}
              onClick={() => setActiveTab("nearby")}
            >
              {t("picker.nearby")}
            </button>
          </div>
        </div>

        {activeTab === "search" && (
          <div className="p-4">
            <div className="flex space-x-2 mb-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("picker.search_placeholder")}
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {t("common.search")}
              </button>
            </div>
            <div className="overflow-auto max-h-[50vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      {t("common.name")}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      {t("common.address")}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      {t("common.city")}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      OIB
                    </th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-sm">{r.name}</td>
                      <td className="px-4 py-2 text-sm">{r.address || "-"}</td>
                      <td className="px-4 py-2 text-sm">{r.place || "-"}</td>
                      <td className="px-4 py-2 text-sm">{r.oib || "-"}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          className="px-3 py-1 bg-green-600 text-white rounded"
                          onClick={() => onSelect(r)}
                        >
                          {t("common.select")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "nearby" && (
          <div className="p-4">
            {typeof userLat === "number" && typeof userLng === "number" ? (
              <>
                <MapMini
                  center={{ lat: userLat!, lng: userLng! }}
                  userMarker={{ lat: userLat!, lng: userLng! }}
                  restaurants={nearby
                    .filter(
                      (r) =>
                        typeof r.latitude === "number" &&
                        typeof r.longitude === "number"
                    )
                    .map((r) => ({
                      id: r.id,
                      name: r.name,
                      lat: r.latitude as number,
                      lng: r.longitude as number,
                    }))}
                  onSelect={(id) => {
                    const r = nearby.find((x) => x.id === id);
                    if (r) onSelect(r);
                  }}
                />
                <div className="mt-3">
                  <ul className="divide-y">
                    {nearby.map((r) => (
                      <li
                        key={r.id}
                        className="py-2 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-medium">{r.name}</div>
                          <div className="text-xs text-gray-600">
                            {r.address || "-"} {r.place ? `, ${r.place}` : ""}
                          </div>
                        </div>
                        <button
                          className="px-3 py-1 bg-green-600 text-white rounded"
                          onClick={() => onSelect(r)}
                        >
                          Select
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-gray-600 text-sm">
                {t("picker.no_user_coords")}
              </div>
            )}
          </div>
        )}

        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPickerModal;

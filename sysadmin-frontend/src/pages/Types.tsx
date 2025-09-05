import React, { useEffect, useMemo, useState } from "react";
import {
  ManagedType,
  SysTypeItem,
  getTypes,
  createType,
  updateType,
  deleteType,
  updateTypeOrder,
} from "../services/typesService";
import { useTranslation } from "react-i18next";

type Tab = ManagedType;

const tabs: { key: Tab; labelKey: string }[] = [
  { key: "food-types", labelKey: "food_types" },
  { key: "establishment-types", labelKey: "establishment_types" },
  { key: "establishment-perks", labelKey: "establishment_perks" },
  { key: "meal-types", labelKey: "meal_types" },
  { key: "dietary-types", labelKey: "dietary_types" },
];

const Types: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("food-types");
  const [items, setItems] = useState<SysTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (i) =>
        i.nameEn.toLowerCase().includes(s) || i.nameHr.toLowerCase().includes(s)
    );
  }, [items, search]);

  const load = async (tab: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTypes(tab);
      const sorted = [...res].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0)
      );
      setItems(sorted);
    } catch (e) {
      setError(t("failed_to_fetch_data") as string);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const [form, setForm] = useState<{
    id?: number;
    nameEn: string;
    nameHr: string;
    icon: string;
  }>({ nameEn: "", nameHr: "", icon: "" });
  const [isEditing, setIsEditing] = useState(false);

  const resetForm = () => {
    setForm({ nameEn: "", nameHr: "", icon: "" });
    setIsEditing(false);
  };

  const handleCreate = async () => {
    if (!form.nameEn.trim() || !form.nameHr.trim() || !form.icon.trim()) return;
    const created = await createType(activeTab, {
      nameEn: form.nameEn.trim(),
      nameHr: form.nameHr.trim(),
      icon: form.icon.trim(),
    });
    setItems((prev) =>
      [...prev, created].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    );
    resetForm();
  };

  const handleUpdate = async () => {
    if (!isEditing || !form.id) return;
    const updated = await updateType(activeTab, form.id, {
      nameEn: form.nameEn.trim(),
      nameHr: form.nameHr.trim(),
      icon: form.icon.trim(),
    });
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    resetForm();
  };

  const handleDelete = async (id: number) => {
    await deleteType(activeTab, id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...items];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index];
    next[index] = next[j];
    next[j] = tmp;
    setItems(next);
  };

  const saveOrder = async () => {
    const order = items.map((i) => i.id);
    await updateTypeOrder(activeTab, order);
    // ensure positions reflect order locally
    setItems((prev) => prev.map((i, idx) => ({ ...i, position: idx })));
  };

  return (
    <div className="">
      <h1 className="text-2xl font-bold mb-2">{t("types_management")}</h1>
      <p className="text-sm text-gray-600 mb-4">{t("types_management_desc")}</p>

      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm ${
              activeTab === tab.key
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search") || "Search"}
          className="text-sm p-2 border border-gray-300 rounded-md w-64"
        />
        <button onClick={saveOrder} className="secondary-button text-xs">
          {t("save_order")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <h2 className="text-lg font-semibold mb-3">
            {isEditing ? t("edit") : t("add_new")}
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              value={form.nameEn}
              onChange={(e) =>
                setForm((p) => ({ ...p, nameEn: e.target.value }))
              }
              placeholder={`${t("name")} (EN)`}
              className="w-full text-sm p-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              value={form.nameHr}
              onChange={(e) =>
                setForm((p) => ({ ...p, nameHr: e.target.value }))
              }
              placeholder={`${t("name")} (HR)`}
              className="w-full text-sm p-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              value={form.icon}
              onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
              placeholder={t("icon") || "Icon"}
              className="w-full text-sm p-2 border border-gray-300 rounded-md"
            />
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleUpdate}
                    className="primary-button text-xs"
                  >
                    {t("update")}
                  </button>
                  <button
                    onClick={resetForm}
                    className="secondary-button text-xs"
                  >
                    {t("cancel")}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCreate}
                  className="primary-button text-xs"
                >
                  {t("add")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <h2 className="text-lg font-semibold mb-3">{t("list")}</h2>
          {loading ? (
            <div className="text-sm text-gray-600">{t("loading")}</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filtered.map((item, idx) => (
                <li key={item.id} className="py-2 flex items-center gap-3">
                  <span className="text-lg" title={item.nameEn}>
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.nameHr} / {item.nameEn}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {item.id} · Pos: {item.position ?? idx}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-xs px-2 py-1 rounded-md border border-gray-300"
                      onClick={() => {
                        setForm({
                          id: item.id,
                          nameEn: item.nameEn,
                          nameHr: item.nameHr,
                          icon: item.icon,
                        });
                        setIsEditing(true);
                      }}
                    >
                      {t("edit")}
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-600"
                      onClick={() => handleDelete(item.id)}
                    >
                      {t("delete")}
                    </button>
                    <div className="flex gap-1">
                      <button
                        className="text-xs px-2 py-1 rounded-md border border-gray-300"
                        onClick={() => move(idx, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded-md border border-gray-300"
                        onClick={() => move(idx, +1)}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Types;

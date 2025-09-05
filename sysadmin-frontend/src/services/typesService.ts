import { apiClient } from "./authService";

export type ManagedType =
  | "food-types"
  | "establishment-types"
  | "establishment-perks"
  | "meal-types"
  | "dietary-types";

export interface SysTypeItem {
  id: number;
  nameEn: string;
  nameHr: string;
  icon: string;
  position?: number;
}

export const getTypes = async (type: ManagedType): Promise<SysTypeItem[]> => {
  const endpointMap: Record<ManagedType, string> = {
    "food-types": "/api/sysadmin/types/food-types",
    "establishment-types": "/api/sysadmin/types/establishment-types",
    "establishment-perks": "/api/sysadmin/types/establishment-perks",
    "meal-types": "/api/sysadmin/types/meal-types",
    "dietary-types": "/api/sysadmin/types/dietary-types",
  };
  const res = await apiClient.get(endpointMap[type]);
  return res.data;
};

export const createType = async (
  type: ManagedType,
  data: Pick<SysTypeItem, "nameEn" | "nameHr" | "icon">
): Promise<SysTypeItem> => {
  const res = await apiClient.post(`/api/sysadmin/types/${type}`, data);
  return res.data;
};

export const updateType = async (
  type: ManagedType,
  id: number,
  data: Partial<Pick<SysTypeItem, "nameEn" | "nameHr" | "icon">>
): Promise<SysTypeItem> => {
  const res = await apiClient.put(`/api/sysadmin/types/${type}/${id}`, data);
  return res.data;
};

export const deleteType = async (
  type: ManagedType,
  id: number
): Promise<{ success: boolean }> => {
  const res = await apiClient.delete(`/api/sysadmin/types/${type}/${id}`);
  return res.data;
};

export const updateTypeOrder = async (
  type: ManagedType,
  order: (number | string)[]
): Promise<{ success: boolean }> => {
  const res = await apiClient.put(`/api/sysadmin/types/${type}-order`, {
    order,
  });
  return res.data;
};

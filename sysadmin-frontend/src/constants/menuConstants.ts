export const VIEWS = {
  LIST: "list",
  ADD_CATEGORY: "addCategory",
  EDIT_CATEGORY: "editCategory",
  ADD_MENU_ITEM: "addMenuItem",
  EDIT_MENU_ITEM: "editMenuItem",
} as const;

export type ViewType = (typeof VIEWS)[keyof typeof VIEWS];

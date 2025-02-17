// permissions.ts
const permissions = {
  owner: ["viewAdmins"],
  admin: ["home"],
  helper: ["home"],
};

export const canAccess = (role: string, action: string): boolean => {
  return (
    permissions[role as keyof typeof permissions]?.includes(action) || false
  );
};

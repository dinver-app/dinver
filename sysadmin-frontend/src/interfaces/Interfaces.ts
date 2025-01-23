export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt?: string;
}

export interface Sysadmin {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: User;
}

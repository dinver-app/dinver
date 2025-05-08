/* eslint-disable @typescript-eslint/no-unused-vars */
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { STORAGE_KEYS, clearAuth } from "@/services/api";
import {
  LoginInput,
  RegisterInput,
  User,
  loginSchema,
  registerSchema,
  userSchema,
} from "@/utils/validation";
import { showError, showSuccess } from "@/utils/toast";

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
  refreshToken: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export type { LoginInput, RegisterInput, User };

const AUTH_ENDPOINTS = {
  LOGIN: "/auth/Login",
  REGISTER: "/auth/Register",
  FORGOT_PASSWORD: "/auth/forgot-password",
  VERIFICATION_STATUS: "/auth/verification-status",
  VERIFY_EMAIL: "/auth/verify-email",
  VERIFY_PHONE: "/auth/verify-phone",
  VERIFY_PHONE_CONFIRM: "/auth/verify-phone/confirm",
};

const storeAuthData = async (response: AuthResponse): Promise<User> => {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, response.token],
    [STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken],
    [STORAGE_KEYS.USER, JSON.stringify(response.user)],
  ]);
  return response.user;
};

export const register = async (data: RegisterInput): Promise<User> => {
  try {
    registerSchema.parse(data);
    const response = await api.post<AuthResponse>(
      AUTH_ENDPOINTS.REGISTER,
      data
    );
    showSuccess("Registration successful", "Welcome to Croativa!");
    return storeAuthData(response.data);
  } catch (error: any) {
    if (error.response?.data?.error === "Phone number already exists") {
      showError("Registration Error", "Phone number already exists");
      error.isHandled = true;
    } else if (error.response?.data?.error === "Email already exists") {
      showError("Registration Error", "Email already exists");
      error.isHandled = true;
    } else {
      const message = error.response?.data?.message || "Registration failed";
      showError("Registration Error", message);
    }
    throw error;
  }
};

export const login = async (data: LoginInput): Promise<User> => {
  try {
    loginSchema.parse(data);
    const response = await api.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, data);
    showSuccess(
      "Login successful",
      `Welcome back, ${response.data.user.firstName}!`
    );
    return storeAuthData(response.data);
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Invalid email or password";
    showError("Login Error", message);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await clearAuth();
    showSuccess("Logged out", "You have been successfully logged out");
  } catch (error) {
    console.log("Logout error:", error);
    showError("Logout failed", "Please try again");
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (!userJson) return null;

    const userData = JSON.parse(userJson);
    return userSchema.parse(userData);
  } catch (error) {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    return null;
  }
};

export const forgotPassword = async (email: string): Promise<string> => {
  try {
    if (!email || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    const response = await api.post<ForgotPasswordResponse>(
      AUTH_ENDPOINTS.FORGOT_PASSWORD,
      { email }
    );
    showSuccess("Password reset", "Check your email for instructions");
    return response.data.message;
  } catch (error: any) {
    const message = error.response?.data?.message || "Password reset failed";
    showError("Error", message);
    throw error;
  }
};

// Verification related functionality
export const verifyEmail = async (): Promise<boolean> => {
  try {
    await api.post(AUTH_ENDPOINTS.VERIFY_EMAIL);
    showSuccess("Verification email sent", "Please check your inbox");
    return true;
  } catch (error) {
    showError("Verification error", "Could not send verification email");
    throw error;
  }
};

export const verifyPhone = async (): Promise<boolean> => {
  try {
    await api.post(AUTH_ENDPOINTS.VERIFY_PHONE);
    showSuccess("Verification SMS sent", "Please check your phone");
    return true;
  } catch (error) {
    showError("Verification error", "Could not send verification SMS");
    throw error;
  }
};

export const confirmPhoneVerification = async (
  code: string
): Promise<boolean> => {
  try {
    await api.post(AUTH_ENDPOINTS.VERIFY_PHONE_CONFIRM, { code });
    showSuccess("Phone verified", "Your phone number has been verified");
    return true;
  } catch (error) {
    showError("Verification error", "Invalid or expired code");
    throw error;
  }
};

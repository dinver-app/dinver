import { authRequest } from "@/services/api";
import { showError, showSuccess } from "@/utils/toast";

const VERIFY_ENDPOINTS = {
  EMAIL: "/auth/verify-email",
  PHONE: "/auth/verify-phone",
  CONFIRM_PHONE: "/auth/verify-phone/confirm"
};

export const verifyEmail = async (): Promise<boolean> => {
  try {
    await authRequest<{ message: string }>('post', VERIFY_ENDPOINTS.EMAIL);
    showSuccess("Verification email sent", "Please check your inbox for the verification link");
    return true;
  } catch (error: any) {
    const message = error?.response?.data?.message || "Could not send verification email";
    showError("Verification error", message);
    throw error;
  }
};

export const verifyPhone = async (): Promise<boolean> => {
  try {
    await authRequest<{ message: string }>('post', VERIFY_ENDPOINTS.PHONE);
    showSuccess("Verification SMS sent", "Please check your phone for the verification code");
    return true;
  } catch (error: any) {
    const message = error?.response?.data?.message || "Could not send verification SMS";
    showError("Verification error", message);
    throw error;
  }
};

export const confirmPhoneVerification = async (code: string): Promise<boolean> => {
  try {
    if (!code || code.trim() === "") {
      showError("Verification error", "Please enter the verification code");
      throw new Error("Verification code cannot be empty");
    }
    
    await authRequest<{ message: string }>('post', VERIFY_ENDPOINTS.CONFIRM_PHONE, { code });
    showSuccess("Phone verified", "Your phone number has been successfully verified");
    return true;
  } catch (error: any) {
    const message = error?.response?.data?.message || "Invalid or expired verification code";
    showError("Verification error", message);
    throw error;
  }
};
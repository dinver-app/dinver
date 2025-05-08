import { authRequest } from "@/services/api";
import {
  verificationStatusSchema,
  VerificationStatus,
} from "@/utils/validation";

const VERIFY_ENDPOINTS = {
  EMAIL: "/auth/verify-email",
  PHONE: "/auth/verify-phone",
  CONFIRM_PHONE: "/auth/verify-phone/confirm",
};

export const verifyEmail = async (): Promise<boolean> => {
  try {
    await authRequest<{ message: string }>("post", VERIFY_ENDPOINTS.EMAIL);
    return true;
  } catch (error: any) {
    const message =
      error?.response?.data?.message || "Could not send verification email";
    throw new Error(message);
  }
};

export const verifyPhone = async (
  code: string
): Promise<VerificationStatus> => {
  if (!code) {
    throw new Error("Please enter the verification code");
  }

  try {
    const response = await authRequest("post", VERIFY_ENDPOINTS.CONFIRM_PHONE, {
      code,
    });
    return verificationStatusSchema.parse(response);
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Failed to verify phone number";
    throw new Error(message);
  }
};

export const confirmPhoneVerification = async (
  code: string
): Promise<boolean> => {
  try {
    if (!code || code.trim() === "") {
      throw new Error("Verification code cannot be empty");
    }

    await authRequest<{ message: string }>(
      "post",
      VERIFY_ENDPOINTS.CONFIRM_PHONE,
      { code }
    );
    return true;
  } catch (error: any) {
    const message =
      error?.response?.data?.message || "Invalid or expired verification code";
    throw new Error(message);
  }
};

export const sendVerificationEmail = async (): Promise<VerificationStatus> => {
  try {
    const response = await authRequest("post", "/verify/email");
    return verificationStatusSchema.parse(response);
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Failed to send verification email";
    throw new Error(message);
  }
};

export const sendVerificationSMS = async (
  phoneNumber: string
): Promise<VerificationStatus> => {
  try {
    const response = await authRequest("post", "/verify/phone", {
      phoneNumber,
    });
    return verificationStatusSchema.parse(response);
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Failed to send verification SMS";
    throw new Error(message);
  }
};

export interface AppError extends Error {
  code?: string;
  isHandled?: boolean;
}

export function createError(message: string, code?: string): AppError {
  const error = new Error(message) as AppError;
  if (code) {
    error.code = code;
  }
  return error;
}
import { apiClient } from "./authService";

export const translateText = async (
  text: string,
  targetLang: string
): Promise<string> => {
  try {
    const response = await apiClient.post("/api/translate", {
      text,
      targetLang,
    });
    return response.data.translatedText;
  } catch (error) {
    throw new Error("Failed to translate text");
  }
};

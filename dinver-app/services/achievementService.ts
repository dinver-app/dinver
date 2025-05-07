import { authRequest } from "@/services/api";
import { 
  AchievementsResponse,
  achievementsResponseSchema
} from "@/utils/validation";
import { showError } from "@/utils/toast";

export const fetchAchievements = async (): Promise<AchievementsResponse> => {
  try {
    const data = await authRequest<AchievementsResponse>('get', "/achievements");
    return achievementsResponseSchema.parse(data);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    showError("Error", "Unable to retrieve your achievements");
    throw error;
  }
};
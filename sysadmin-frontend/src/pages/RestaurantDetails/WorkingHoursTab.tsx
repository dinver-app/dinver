import { useEffect, useState } from "react";
import {
  updateRestaurant,
  updateWorkingHours,
} from "../../services/restaurantService";
import { Restaurant } from "../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";

interface WorkingHoursTabProps {
  restaurant: Restaurant;
  onUpdate: (updatedRestaurant: Restaurant) => void;
}

const formatTime = (time: string) => {
  if (time.length === 4) {
    return `${time.slice(0, 2)}:${time.slice(2)}`;
  }
  return time;
};

const unformatTime = (time: string) => {
  return time.replace(":", "");
};

const WorkingHoursTab = ({ restaurant, onUpdate }: WorkingHoursTabProps) => {
  const { t } = useTranslation();

  const daysOfWeek = [
    t("monday"),
    t("tuesday"),
    t("wednesday"),
    t("thursday"),
    t("friday"),
    t("saturday"),
    t("sunday"),
  ];

  const [workingHours, setWorkingHours] = useState(() => {
    const initialHours = Array(7).fill({
      open: { day: 0, time: "" },
      close: { day: 0, time: "" },
    });

    if (restaurant.opening_hours?.periods) {
      JSON.parse(JSON.stringify(restaurant.opening_hours.periods)).forEach(
        (period: any) => {
          initialHours[period.open.day] = period;
        }
      );
    } else if (
      restaurant.opening_hours &&
      Object.keys(restaurant.opening_hours).length === 0
    ) {
      // If opening_hours is an empty object, initialize with default structure
      return initialHours;
    }

    return initialHours;
  });

  const [workingHoursInfo, setWorkingHoursInfo] = useState(
    restaurant.working_hours_info || ""
  );

  const [saveStatus, setSaveStatus] = useState(t("all_changes_saved"));

  useEffect(() => {
    const handleAutoSave = async () => {
      setSaveStatus(t("saving"));
      try {
        await updateWorkingHours(restaurant.id || "", {
          periods: workingHours,
        });
        await updateRestaurant(restaurant.id || "", {
          working_hours_info: workingHoursInfo,
        });
        onUpdate({
          ...restaurant,
          opening_hours: { periods: workingHours },
          working_hours_info: workingHoursInfo,
        });
        setSaveStatus(t("all_changes_saved"));
      } catch (error) {
        console.error("Failed to update working hours", error);
        setSaveStatus(t("failed_to_save_changes"));
      }
    };

    if (isFormModified()) {
      handleAutoSave();
    }
  }, [workingHours, workingHoursInfo]);

  useEffect(() => {
    if (
      restaurant.opening_hours &&
      Object.keys(restaurant.opening_hours).length === 0
    ) {
      setWorkingHours(
        Array(7).fill({
          open: { day: 0, time: "" },
          close: { day: 0, time: "" },
        })
      );
    }
  }, [restaurant]);

  const isFormModified = () => {
    const restaurantOpeningHours = restaurant.opening_hours?.periods
      ? restaurant.opening_hours?.periods
      : restaurant.opening_hours;

    return (
      JSON.stringify(workingHours) !== restaurantOpeningHours ||
      workingHoursInfo !== restaurant.working_hours_info
    );
  };

  const handleTimeChange = (
    dayIndex: number,
    type: "open" | "close",
    time: string
  ) => {
    setWorkingHours((prev) => {
      const updated = [...prev];
      if (!updated[dayIndex]) {
        updated[dayIndex] = {
          open: { day: dayIndex, time: "" },
          close: { day: dayIndex, time: "" },
        };
      }
      updated[dayIndex][type].time = unformatTime(time);
      return updated;
    });
  };

  const handleClosed = (dayIndex: number) => {
    handleTimeChange(dayIndex, "open", "");
    handleTimeChange(dayIndex, "close", "");
  };

  const handleInfoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWorkingHoursInfo(e.target.value);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-end items-center">
        <span className="text-sm text-gray-500">{saveStatus}</span>
      </div>
      <h2 className="section-title text-md">{t("working_hours")}</h2>

      {daysOfWeek.map((day, index) => (
        <div key={day} className="flex items-center gap-2 my-2">
          <span className="w-24 text-sm">{day}:</span>
          <input
            type="time"
            value={formatTime(workingHours[index]?.open.time || "")}
            onChange={(e) => handleTimeChange(index, "open", e.target.value)}
            className="border p-1 rounded"
          />
          <span>-</span>
          <input
            type="time"
            value={formatTime(workingHours[index]?.close.time || "")}
            onChange={(e) => handleTimeChange(index, "close", e.target.value)}
            className="border p-1 rounded"
          />
          <button
            onClick={() => handleClosed(index)}
            className="text-xs text-white bg-red-500 px-2 py-1 rounded-md hover:bg-red-600 ml-4"
          >
            {t("closed")}
          </button>
        </div>
      ))}

      <div className="flex flex-col gap-2 py-2">
        <h2 className="section-title text-md">{t("working_hours_info")}</h2>
        <textarea
          value={workingHoursInfo}
          onChange={handleInfoChange}
          className="border p-2 rounded w-full h-24"
          placeholder={t("enter_additional_working_hours_information_here")}
        />
      </div>
    </div>
  );
};

export default WorkingHoursTab;

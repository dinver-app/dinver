import { useEffect, useState } from "react";
import {
  updateWorkingHours,
  getCustomWorkingDays,
  addCustomWorkingDay,
  updateCustomWorkingDay,
  deleteCustomWorkingDay,
} from "../../services/restaurantService";
import {
  CustomWorkingDay,
  WorkingHoursTabProps,
} from "../../interfaces/Interfaces";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { format, isBefore, startOfDay } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { hr, enUS } from "date-fns/locale";

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
  const { t, i18n } = useTranslation();

  const locale = i18n.language === "hr" ? hr : enUS;

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
      shifts: [],
    });

    if (restaurant.openingHours?.periods) {
      JSON.parse(JSON.stringify(restaurant.openingHours.periods)).forEach(
        (period: any) => {
          initialHours[period.open.day] = {
            ...period,
            shifts: period.shifts || [],
          };
        }
      );
    } else if (
      restaurant.openingHours &&
      Object.keys(restaurant.openingHours).length === 0
    ) {
      return initialHours;
    }

    return initialHours;
  });

  const [saveStatus, setSaveStatus] = useState(t("all_changes_saved"));

  const [customWorkingDays, setCustomWorkingDays] = useState<
    CustomWorkingDay[]
  >([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCustomDay, setEditCustomDay] = useState<CustomWorkingDay | null>(
    null
  );
  const [newCustomDay, setNewCustomDay] = useState({
    name: "",
    date: "",
    times: [{ open: "", close: "" }],
  });

  const [isSplitShift, setIsSplitShift] = useState(
    newCustomDay.times.length > 1
  );

  useEffect(() => {
    const handleAutoSave = async () => {
      setSaveStatus(t("saving"));
      try {
        await updateWorkingHours(restaurant.id || "", {
          periods: workingHours,
        });
        onUpdate({
          ...restaurant,
          openingHours: { periods: workingHours },
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
  }, [workingHours]);

  useEffect(() => {
    if (
      restaurant.openingHours &&
      Object.keys(restaurant.openingHours).length === 0
    ) {
      setWorkingHours(
        Array(7).fill({
          open: { day: 0, time: "" },
          close: { day: 0, time: "" },
          shifts: [],
        })
      );
    }
  }, [restaurant]);

  useEffect(() => {
    const fetchCustomWorkingDays = async () => {
      try {
        const response = await getCustomWorkingDays(restaurant.id || "");
        setCustomWorkingDays(response.customWorkingDays || []);
      } catch (error) {
        console.error("Failed to fetch custom working days", error);
      }
    };

    fetchCustomWorkingDays();
  }, [restaurant.id]);

  useEffect(() => {
    setIsSplitShift(newCustomDay.times.length > 1);
  }, [newCustomDay]);

  useEffect(() => {
    if (editCustomDay) {
      setIsSplitShift(editCustomDay.times.length > 1);
    }
  }, [editCustomDay]);

  const isFormModified = () => {
    const restaurantOpeningHours = restaurant.openingHours?.periods
      ? restaurant.openingHours?.periods
      : restaurant.openingHours;

    return JSON.stringify(workingHours) !== restaurantOpeningHours;
  };

  const handleTimeChange = (
    dayIndex: number,
    type: "open" | "close",
    time: string,
    shiftIndex: number = 0
  ) => {
    setWorkingHours((prev) => {
      const updated = [...prev];
      if (!updated[dayIndex]) {
        updated[dayIndex] = {
          open: { day: dayIndex, time: "" },
          close: { day: dayIndex, time: "" },
          shifts: [],
        };
      }
      const formattedTime = unformatTime(time);
      if (shiftIndex === 0) {
        updated[dayIndex][type].time = formattedTime;
        if (type === "close") {
          const openTime = parseInt(updated[dayIndex].open.time, 10);
          if (parseInt(formattedTime, 10) < openTime) {
            updated[dayIndex][type].day = (dayIndex + 1) % 7;
          } else {
            updated[dayIndex][type].day = dayIndex;
          }
        }
      } else {
        if (!updated[dayIndex].shifts[shiftIndex - 1]) {
          updated[dayIndex].shifts[shiftIndex - 1] = {
            open: { day: dayIndex, time: "" },
            close: { day: dayIndex, time: "" },
          };
        }
        updated[dayIndex].shifts[shiftIndex - 1][type].time = formattedTime;
        if (type === "close") {
          const openTime = parseInt(
            updated[dayIndex].shifts[shiftIndex - 1].open.time,
            10
          );
          if (parseInt(formattedTime, 10) < openTime) {
            updated[dayIndex].shifts[shiftIndex - 1][type].day =
              (dayIndex + 1) % 7;
          } else {
            updated[dayIndex].shifts[shiftIndex - 1][type].day = dayIndex;
          }
        }
      }

      return updated;
    });
  };

  const handleClosed = (dayIndex: number) => {
    handleTimeChange(dayIndex, "open", "");
    handleTimeChange(dayIndex, "close", "");
  };

  const handleAddCustomDay = async () => {
    if (!validateCustomDay(newCustomDay)) return;

    try {
      const timesToSend = isSplitShift
        ? newCustomDay.times
        : [newCustomDay.times[0]];

      const customDayToSend = { ...newCustomDay, times: timesToSend };

      await addCustomWorkingDay(restaurant.id || "", customDayToSend);
      setCustomWorkingDays([...customWorkingDays, customDayToSend]);
      toast.success(t("custom_day_added_successfully"));
      setIsAddModalOpen(false);
      setNewCustomDay({ name: "", date: "", times: [{ open: "", close: "" }] });
    } catch (error: any) {
      console.error(
        "Failed to add custom working day",
        error.response.data.error
      );
      toast.error(t(error.response.data.error));
    }
  };

  const handleUpdateCustomDay = async () => {
    if (!editCustomDay || !validateCustomDay(editCustomDay)) return;

    try {
      const timesToSend = isSplitShift
        ? editCustomDay.times
        : [editCustomDay.times[0]];

      const customDayToSend = { ...editCustomDay, times: timesToSend };

      await updateCustomWorkingDay(restaurant.id || "", customDayToSend);
      setCustomWorkingDays((prev) =>
        prev.map((day) =>
          day.date === editCustomDay.date ? customDayToSend : day
        )
      );
      toast.success(t("custom_day_updated_successfully"));
      setIsEditModalOpen(false);
      setEditCustomDay(null);
    } catch (error: any) {
      console.error("Failed to update custom working day", error);
      toast.error(t(error.response.data.error));
    }
  };

  const handleDeleteCustomDay = async (index: number) => {
    try {
      const dayToDelete = customWorkingDays[index];
      await deleteCustomWorkingDay(restaurant.id || "", dayToDelete.date);
      setCustomWorkingDays((prev) => prev.filter((_, i) => i !== index));
      toast.success(t("custom_day_deleted_successfully"));
    } catch (error) {
      console.error("Failed to delete custom working day", error);
    }
  };

  const validateCustomDay = (customDay: CustomWorkingDay) => {
    if (!customDay.date) {
      toast.error(t("date_cannot_be_empty"));
      return false;
    }
    for (const time of customDay.times) {
      if (!time.open || !time.close) {
        toast.error(t("time_cannot_be_empty"));
        return false;
      }
    }
    return true;
  };

  const handleOpenAddModal = () => {
    setNewCustomDay({ name: "", date: "", times: [{ open: "", close: "" }] });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (day: CustomWorkingDay) => {
    setEditCustomDay(day);
    setIsEditModalOpen(true);
    setIsSplitShift(day.times.length > 1);
  };

  const handleSplitShiftChange = () => {
    setIsSplitShift(!isSplitShift);
    setEditCustomDay((prev) => {
      if (!prev) return prev;
      const newTimes = isSplitShift
        ? prev.times.slice(0, 1)
        : [...prev.times, { open: "", close: "" }];
      return { ...prev, times: newTimes };
    });
  };

  return (
    <div className="flex flex-col">
      {/* Header with title and save status */}
      <div className="border-b border-gray-200 pb-5 mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          {t("working_hours")}
        </h2>
        <div className="flex items-center">
          {saveStatus === t("saving") ? (
            <span className="text-sm text-amber-600 flex items-center">
              <svg
                className="animate-spin h-4 w-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {saveStatus}
            </span>
          ) : saveStatus === t("failed_to_save_changes") ? (
            <span className="text-sm text-red-600 flex items-center">
              <svg
                className="h-4 w-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                ></path>
              </svg>
              {saveStatus}
            </span>
          ) : (
            <span className="text-sm text-green-600 flex items-center">
              <svg
                className="h-4 w-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                ></path>
              </svg>
              {saveStatus}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        {t("days_without_hours_added_will_display_as_closed")}
      </p>

      {/* Content sections */}
      <div className="space-y-8">
        {/* Regular Working Hours */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {t("regular_hours")}
          </h3>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {daysOfWeek.map((day, index) => (
              <div
                key={day}
                className={`flex items-center p-4 ${
                  index !== daysOfWeek.length - 1
                    ? "border-b border-gray-200"
                    : ""
                } hover:bg-gray-50 transition-colors`}
              >
                <div className="w-32 font-medium text-gray-700">{day}</div>

                {!workingHours[index].open.time &&
                !workingHours[index].close.time ? (
                  <div className="flex flex-1 items-center">
                    <span className="text-sm text-gray-500 italic">
                      {t("closed")}
                    </span>
                    <button
                      onClick={() => {
                        handleTimeChange(index, "open", "0900");
                        handleTimeChange(index, "close", "1700");
                      }}
                      className="ml-4 text-sm px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                    >
                      {t("add_hours")}
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={formatTime(workingHours[index].open.time || "")}
                        onChange={(e) =>
                          handleTimeChange(index, "open", e.target.value)
                        }
                        className="py-1.5 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="time"
                        value={formatTime(workingHours[index].close.time || "")}
                        onChange={(e) =>
                          handleTimeChange(index, "close", e.target.value)
                        }
                        className="py-1.5 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {workingHours[index].shifts.length > 0 && (
                      <>
                        <div className="w-px h-8 bg-gray-200"></div>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={formatTime(
                              workingHours[index].shifts[0].open.time || ""
                            )}
                            onChange={(e) =>
                              handleTimeChange(index, "open", e.target.value, 1)
                            }
                            className="py-1.5 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="time"
                            value={formatTime(
                              workingHours[index].shifts[0].close.time || ""
                            )}
                            onChange={(e) =>
                              handleTimeChange(
                                index,
                                "close",
                                e.target.value,
                                1
                              )
                            }
                            className="py-1.5 px-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex ml-auto gap-2">
                      <button
                        onClick={() => {
                          setWorkingHours((prev) => {
                            const updated = [...prev];
                            if (updated[index].shifts.length > 0) {
                              updated[index].shifts = [];
                            } else {
                              updated[index].shifts = [
                                {
                                  open: { day: index, time: "" },
                                  close: { day: index, time: "" },
                                },
                              ];
                            }
                            return updated;
                          });
                        }}
                        className={`text-xs px-3 py-1.5 rounded-md ${
                          workingHours[index].shifts.length > 0
                            ? "text-white bg-blue-600 hover:bg-blue-700"
                            : "text-blue-600 bg-white border border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {workingHours[index].shifts.length > 0
                          ? t("remove_split")
                          : t("split_shift")}
                      </button>
                      <button
                        onClick={() => {
                          handleClosed(index);
                          setWorkingHours((prev) => {
                            const updated = [...prev];
                            updated[index].shifts = [];
                            updated[index].open.time = "";
                            updated[index].close.time = "";
                            return updated;
                          });
                        }}
                        className="text-xs text-red-600 border border-red-300 bg-white px-3 py-1.5 rounded-md hover:bg-red-50"
                      >
                        {t("mark_closed")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Working Days */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {t("custom_working_days")}
          </h3>

          <div className="flex justify-between items-center">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              {t("add_custom_day")}
            </button>
          </div>

          {customWorkingDays.length === 0 ? (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center mt-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t("no_custom_days")}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {t("no_custom_working_days")}
              </p>
              <div className="mt-6">
                <button
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  {t("add_custom_day")}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {customWorkingDays.map((day, index) => {
                const dayDate = new Date(day.date);
                const isPast = isBefore(
                  startOfDay(dayDate),
                  startOfDay(new Date())
                );

                return (
                  <div
                    key={index}
                    className={`bg-white rounded-lg shadow-sm border ${
                      isPast ? "border-gray-200 opacity-70" : "border-gray-300"
                    } overflow-hidden transition-all hover:shadow-md`}
                  >
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                      <div className="flex items-center">
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-md ${
                            isPast
                              ? "bg-gray-100 text-gray-500"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            {day.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {format(dayDate, "dd.MM.yyyy")}
                          </p>
                        </div>
                      </div>
                      {isPast && (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
                          {t("past")}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-3">
                        <h4 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                          {t("hours")}
                        </h4>
                        <div className="space-y-1">
                          {day.times.map((time, i) => (
                            <div key={i} className="text-sm flex items-center">
                              <svg
                                className="w-4 h-4 text-gray-400 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span className="font-medium">
                                {formatTime(time.open)} -{" "}
                                {formatTime(time.close)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-4 justify-end">
                        <button
                          onClick={() => handleOpenEditModal(day)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <svg
                            className="w-3.5 h-3.5 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => handleDeleteCustomDay(index)}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                        >
                          <svg
                            className="w-3.5 h-3.5 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          {t("delete")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Day Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <div className="bg-blue-50 rounded-md p-2 mr-3">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {t("add_custom_day")}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t("add_custom_day_description")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal content */}
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("name")}
                  </label>
                  <input
                    type="text"
                    value={newCustomDay.name}
                    onChange={(e) =>
                      setNewCustomDay({ ...newCustomDay, name: e.target.value })
                    }
                    placeholder={t("custom_day_name_placeholder")}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("date")}
                  </label>
                  <DatePicker
                    selected={
                      newCustomDay.date ? new Date(newCustomDay.date) : null
                    }
                    onChange={(date) =>
                      setNewCustomDay({
                        ...newCustomDay,
                        date: date ? format(date, "yyyy-MM-dd") : "",
                      })
                    }
                    dateFormat="dd.MM.yyyy"
                    locale={locale}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholderText={t("select_date")}
                  />
                </div>

                <div className="pt-2">
                  <div className="relative flex items-start mb-3">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={isSplitShift}
                        onChange={() => {
                          setIsSplitShift(!isSplitShift);
                          if (isSplitShift) {
                            // Reset to a single time slot
                            setNewCustomDay({
                              ...newCustomDay,
                              times: [newCustomDay.times[0]],
                            });
                          } else {
                            // Add a second time slot
                            setNewCustomDay({
                              ...newCustomDay,
                              times: [
                                ...newCustomDay.times,
                                { open: "", close: "" },
                              ],
                            });
                          }
                        }}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">
                        {t("split_shift")}
                      </label>
                      <p className="text-gray-500">
                        {t("split_shift_description")}
                      </p>
                    </div>
                  </div>
                </div>

                {newCustomDay.times.map((time, index) => (
                  <div key={index} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {isSplitShift
                        ? `${t("time_period")} ${index + 1}`
                        : t("working_hours")}
                    </label>
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">
                          {t("open")}
                        </label>
                        <input
                          type="time"
                          value={time.open}
                          onChange={(e) => {
                            const newTimes = [...newCustomDay.times];
                            newTimes[index].open = e.target.value;
                            setNewCustomDay({
                              ...newCustomDay,
                              times: newTimes,
                            });
                          }}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">
                          {t("close")}
                        </label>
                        <input
                          type="time"
                          value={time.close}
                          onChange={(e) => {
                            const newTimes = [...newCustomDay.times];
                            newTimes[index].close = e.target.value;
                            setNewCustomDay({
                              ...newCustomDay,
                              times: newTimes,
                            });
                          }}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleAddCustomDay}
                className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t("add")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Custom Day Modal */}
      {isEditModalOpen && editCustomDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <div className="bg-blue-50 rounded-md p-2 mr-3">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {t("edit_custom_day")}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t("edit_custom_day_description")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal content */}
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("name")}
                  </label>
                  <input
                    type="text"
                    value={editCustomDay.name}
                    onChange={(e) =>
                      setEditCustomDay({
                        ...editCustomDay,
                        name: e.target.value,
                      })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("date")}
                  </label>
                  <DatePicker
                    selected={
                      editCustomDay.date ? new Date(editCustomDay.date) : null
                    }
                    onChange={(date) =>
                      setEditCustomDay({
                        ...editCustomDay,
                        date: date ? date.toISOString().split("T")[0] : "",
                      })
                    }
                    dateFormat="dd.MM.yyyy"
                    locale={locale}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div className="pt-2">
                  <div className="relative flex items-start mb-3">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={isSplitShift}
                        onChange={handleSplitShiftChange}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">
                        {t("split_shift")}
                      </label>
                      <p className="text-gray-500">
                        {t("split_shift_description")}
                      </p>
                    </div>
                  </div>
                </div>

                {isSplitShift ? (
                  editCustomDay.times.map((time, index) => (
                    <div key={index} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {`${t("time_period")} ${index + 1}`}
                      </label>
                      <div className="flex gap-3 items-center">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">
                            {t("open")}
                          </label>
                          <input
                            type="time"
                            value={time.open}
                            onChange={(e) => {
                              const newTimes = [...editCustomDay.times];
                              newTimes[index].open = e.target.value;
                              setEditCustomDay({
                                ...editCustomDay,
                                times: newTimes,
                              });
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">
                            {t("close")}
                          </label>
                          <input
                            type="time"
                            value={time.close}
                            onChange={(e) => {
                              const newTimes = [...editCustomDay.times];
                              newTimes[index].close = e.target.value;
                              setEditCustomDay({
                                ...editCustomDay,
                                times: newTimes,
                              });
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t("working_hours")}
                    </label>
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">
                          {t("open")}
                        </label>
                        <input
                          type="time"
                          value={editCustomDay.times[0].open}
                          onChange={(e) => {
                            const newTimes = [
                              {
                                open: e.target.value,
                                close: editCustomDay.times[0].close,
                              },
                            ];
                            setEditCustomDay({
                              ...editCustomDay,
                              times: newTimes,
                            });
                          }}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">
                          {t("close")}
                        </label>
                        <input
                          type="time"
                          value={editCustomDay.times[0].close}
                          onChange={(e) => {
                            const newTimes = [
                              {
                                open: editCustomDay.times[0].open,
                                close: e.target.value,
                              },
                            ];
                            setEditCustomDay({
                              ...editCustomDay,
                              times: newTimes,
                            });
                          }}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleUpdateCustomDay}
                className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkingHoursTab;

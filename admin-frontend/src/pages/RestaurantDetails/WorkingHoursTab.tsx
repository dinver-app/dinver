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

    if (restaurant.opening_hours?.periods) {
      JSON.parse(JSON.stringify(restaurant.opening_hours.periods)).forEach(
        (period: any) => {
          initialHours[period.open.day] = {
            ...period,
            shifts: period.shifts || [],
          };
        }
      );
    } else if (
      restaurant.opening_hours &&
      Object.keys(restaurant.opening_hours).length === 0
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
          opening_hours: { periods: workingHours },
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
      restaurant.opening_hours &&
      Object.keys(restaurant.opening_hours).length === 0
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
    const restaurantOpeningHours = restaurant.opening_hours?.periods
      ? restaurant.opening_hours?.periods
      : restaurant.opening_hours;

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
      // Determine the times to send based on isSplitShift
      const timesToSend = isSplitShift
        ? newCustomDay.times
        : [newCustomDay.times[0]];

      const customDayToSend = { ...newCustomDay, times: timesToSend };

      await addCustomWorkingDay(restaurant.id || "", customDayToSend);
      setCustomWorkingDays([...customWorkingDays, customDayToSend]);
      toast.success(t("custom_day_added_successfully"));
      setIsAddModalOpen(false);
      setNewCustomDay({ name: "", date: "", times: [{ open: "", close: "" }] });
    } catch (error) {
      console.error("Failed to add custom working day", error);
      toast.error(t("failed_to_add_custom_day"));
    }
  };

  const handleUpdateCustomDay = async () => {
    if (!editCustomDay || !validateCustomDay(editCustomDay)) return;

    try {
      // Determine the times to send based on isSplitShift
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
    } catch (error) {
      console.error("Failed to update custom working day", error);
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
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="section-title text-md">{t("working_hours")}</h2>
          <h3 className="section-subtitle">{t("manage_your_working_hours")}</h3>
        </div>
        <span className="text-sm text-gray-500">{saveStatus}</span>
      </div>

      <div className="h-line"></div>

      {daysOfWeek.map((day, index) => (
        <div key={day} className="flex items-center gap-4 my-2">
          <span className="w-24 text-sm">{day}:</span>
          <input
            type="time"
            value={formatTime(workingHours[index].open.time || "")}
            onChange={(e) => handleTimeChange(index, "open", e.target.value)}
            className="border p-1 rounded"
          />
          <span>-</span>
          <input
            type="time"
            value={formatTime(workingHours[index].close.time || "")}
            onChange={(e) => handleTimeChange(index, "close", e.target.value)}
            className="border p-1 rounded"
          />
          {workingHours[index].shifts.length > 0 && (
            <>
              <span>/</span>
              <input
                type="time"
                value={formatTime(
                  workingHours[index].shifts[0].open.time || ""
                )}
                onChange={(e) =>
                  handleTimeChange(index, "open", e.target.value, 1)
                }
                className="border p-1 rounded"
              />
              <span>-</span>
              <input
                type="time"
                value={formatTime(
                  workingHours[index].shifts[0].close.time || ""
                )}
                onChange={(e) =>
                  handleTimeChange(index, "close", e.target.value, 1)
                }
                className="border p-1 rounded"
              />
            </>
          )}
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
            className={`text-xs px-2 py-1 rounded-md ${
              workingHours[index].shifts.length > 0
                ? "text-white bg-gray-500 hover:bg-gray-600"
                : "text-gray-500 bg-transparent hover:bg-gray-200 border border-gray-300"
            }`}
          >
            {t("split_shift_button")}
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
            className="text-xs text-white bg-red-500 px-2 py-1 rounded-md hover:bg-red-600"
          >
            {t("closed")}
          </button>
        </div>
      ))}

      <div className="flex justify-between items-center">
        <h2 className="section-title text-md">{t("custom_working_days")}</h2>
        <button onClick={handleOpenAddModal} className="secondary-button">
          {t("add_custom_day")}
        </button>
      </div>

      <ul className="list-none space-y-4">
        {customWorkingDays.length === 0 ? (
          <li className="text-sm text-gray-500">
            {t("no_custom_working_days")}
          </li>
        ) : (
          customWorkingDays.map((day, index) => {
            const dayDate = new Date(day.date);
            const isPast = isBefore(
              startOfDay(dayDate),
              startOfDay(new Date())
            );

            return (
              <li
                key={index}
                className="bg-white shadow-md rounded-lg p-4 flex flex-col space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div className="text-lg font-semibold">{day.name}</div>
                  {isPast && (
                    <span className="text-xs text-red-500">
                      {t("day_has_passed")}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {t("date")}: {format(dayDate, "dd.MM.yyyy")}
                </div>
                <div className="text-sm text-gray-600">
                  {t("working_hours")}:{" "}
                  {day.times.map((time, i) => (
                    <span key={i}>
                      {formatTime(time.open)} - {formatTime(time.close)}
                      {i < day.times.length - 1 && ", "}
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => handleOpenEditModal(day)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => handleDeleteCustomDay(index)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    {t("delete")}
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/calendar.svg"
                alt="Calendar Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">{t("add_custom_day")}</h2>
                <p className="text-sm text-gray-500">
                  {t("add_custom_day_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("name")}
              </label>
              <input
                type="text"
                value={newCustomDay.name}
                onChange={(e) =>
                  setNewCustomDay({ ...newCustomDay, name: e.target.value })
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
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
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isSplitShift}
                  onChange={handleSplitShiftChange}
                  className="mr-2"
                />
                {t("split_shift")}
              </label>
            </div>
            {newCustomDay.times.map((time, index) => (
              <div key={index} className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  {isSplitShift
                    ? `${t("time_period")} ${index + 1}`
                    : t("working_hours")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={time.open}
                    onChange={(e) => {
                      const newTimes = [...newCustomDay.times];
                      newTimes[index].open = e.target.value;
                      setNewCustomDay({ ...newCustomDay, times: newTimes });
                    }}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                  />
                  <input
                    type="time"
                    value={time.close}
                    onChange={(e) => {
                      const newTimes = [...newCustomDay.times];
                      newTimes[index].close = e.target.value;
                      setNewCustomDay({ ...newCustomDay, times: newTimes });
                    }}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                  />
                </div>
              </div>
            ))}
            {isSplitShift && newCustomDay.times.length < 2 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  {t("time_period")} 2
                </label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value=""
                    onChange={(e) => {
                      const newTimes = [
                        ...newCustomDay.times,
                        { open: e.target.value, close: "" },
                      ];
                      setNewCustomDay({ ...newCustomDay, times: newTimes });
                    }}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                  />
                  <input
                    type="time"
                    value=""
                    onChange={(e) => {
                      const newTimes = [...newCustomDay.times];
                      newTimes[1].close = e.target.value;
                      setNewCustomDay({ ...newCustomDay, times: newTimes });
                    }}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                  />
                </div>
              </div>
            )}
            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button onClick={handleAddCustomDay} className="primary-button">
                {t("add")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editCustomDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
            <div className="flex items-center mb-4 gap-1">
              <img
                src="/images/calendar.svg"
                alt="Calendar Icon"
                className="w-12 h-12 mr-2 border border-gray-200 rounded-lg p-3"
              />
              <div>
                <h2 className="text-lg font-semibold">
                  {t("edit_custom_day")}
                </h2>
                <p className="text-sm text-gray-500">
                  {t("edit_custom_day_description")}
                </p>
              </div>
            </div>
            <div className="h-line"></div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("name")}
              </label>
              <input
                type="text"
                value={editCustomDay.name}
                onChange={(e) =>
                  setEditCustomDay({ ...editCustomDay, name: e.target.value })
                }
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
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
                className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isSplitShift}
                  onChange={handleSplitShiftChange}
                  className="mr-2"
                />
                {t("split_shift")}
              </label>
            </div>
            {isSplitShift ? (
              editCustomDay.times.map((time, index) => (
                <div key={index} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    {`${t("time_period")} ${index + 1}`}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={time.open}
                      onChange={(e) => {
                        const newTimes = [...editCustomDay.times];
                        newTimes[index].open = e.target.value;
                        setEditCustomDay({ ...editCustomDay, times: newTimes });
                      }}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                    />
                    <input
                      type="time"
                      value={time.close}
                      onChange={(e) => {
                        const newTimes = [...editCustomDay.times];
                        newTimes[index].close = e.target.value;
                        setEditCustomDay({ ...editCustomDay, times: newTimes });
                      }}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  {t("working_hours")}
                </label>
                <div className="flex gap-2">
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
                      setEditCustomDay({ ...editCustomDay, times: newTimes });
                    }}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                  />
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
                      setEditCustomDay({ ...editCustomDay, times: newTimes });
                    }}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded outline-gray-300"
                  />
                </div>
              </div>
            )}
            <div className="h-line"></div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="secondary-button"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleUpdateCustomDay}
                className="primary-button"
              >
                {t("edit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkingHoursTab;

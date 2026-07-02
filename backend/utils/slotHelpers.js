import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Phnom_Penh";

export function parseSlotStartTime(timeStr) {
  if (!timeStr) return timeStr;
  const start = timeStr.split("-")[0].trim();
  return start.length === 5 ? start : start.slice(0, 5);
}

export function getSlotDateTime(slot) {
  const startTime = parseSlotStartTime(slot.time);
  return dayjs(`${slot.date}T${startTime}:00`).tz(TZ);
}

export function isSlotExpired(slot) {
  return getSlotDateTime(slot).isBefore(dayjs().tz(TZ));
}

export function formatSlotResponse(slot) {
  const obj = slot.toObject ? slot.toObject() : { ...slot };
  return {
    ...obj,
    expired: isSlotExpired(obj),
  };
}

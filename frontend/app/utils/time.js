// --- Cambodia time helpers ---
export function getTodayCambodia() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const cambodiaTime = new Date(utc + 7 * 60 * 60000); // UTC+7
  const year = cambodiaTime.getFullYear();
  const month = String(cambodiaTime.getMonth() + 1).padStart(2, "0");
  const day = String(cambodiaTime.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in Cambodia timezone
 */
export function getNowCambodia() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const cambodiaTime = new Date(utc + 7 * 60 * 60000); // UTC+7
  return {
    h: cambodiaTime.getHours(),
    m: cambodiaTime.getMinutes(),
  };
}

/**
 * Get current time rounded to the nearest half hour in Cambodia timezone
 */
export function getNowCambodiaRounded() {
  const now = getNowCambodia();
  let h = now.h;
  let m = now.m <= 30 ? (now.m <= 0 ? 0 : 30) : 0;
  if (m === 0 && now.m > 30) h += 1;
  return { h: String(h).padStart(2, "0"), m: String(m).padStart(2, "0") };
}

/**
 * Minimum selectable time for a given date
 */
export function getMinTime(selectedDate) {
  const today = getTodayCambodia();
  const now = getNowCambodiaRounded();
  return selectedDate === today ? `${now.h}:${now.m}` : "00:00";
}

/**
 * Maximum selectable time
 */
export function getMaxTime() {
  return "23:59";
}

/**
 * Check if a slot is in the past
 */
export function isSlotPastCambodia(slot) {
  const [year, month, day] = slot.date.split("-").map(Number);
  const [hour, minute] = slot.time.split(":").map(Number);
  const slotTime = new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
  return slotTime <= new Date();
}

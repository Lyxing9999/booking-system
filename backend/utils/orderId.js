import dayjs from "dayjs";

export async function generateOrderId(Booking) {
  const datePart = dayjs().format("YYYYMMDD");
  const prefix = `PS5-${datePart}-`;

  const last = await Booking.findOne({ orderId: new RegExp(`^${prefix}`) })
    .sort({ orderId: -1 })
    .select("orderId")
    .lean();

  let seq = 1;
  if (last?.orderId) {
    const parts = last.orderId.split("-");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(num)) seq = num + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

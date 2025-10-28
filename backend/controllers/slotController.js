import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Booking from "../models/Booking.js";
import Slot from "../models/Slot.js";
import AppError from "../utils/errors.js";

dayjs.extend(utc);
dayjs.extend(timezone);

// ============================================================
// @desc    Get all slots
// @route   GET /api/slots
// @access  Public (or Admin Only if protected externally)
// ============================================================
export const getAllSlots = async (req, res, next) => {
  try {
    const slots = await Slot.find();
    res.json(slots);
  } catch (err) {
    next(new AppError("Failed to get slots", 500, "GET_SLOTS_FAILED"));
  }
};

// ============================================================
// @desc    Create a new slot
// @route   POST /api/slots
// @access  Admin
// ============================================================
export const createSlot = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    const slot = new Slot(req.body);
    await slot.save();

    res.json(slot);
  } catch (err) {
    next(new AppError("Failed to create slot", 500, "CREATE_SLOT_FAILED"));
  }
};

// ============================================================
// @desc    Update an existing slot
// @route   PUT /api/slots/:id
// @access  Admin
// ============================================================
export const updateSlot = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    const slot = await Slot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(slot);
  } catch (err) {
    next(new AppError("Failed to update slot", 500, "UPDATE_SLOT_FAILED"));
  }
};

// ============================================================
// @desc    Delete a slot
// @route   DELETE /api/slots/:id
// @access  Admin
// ============================================================
export const deleteSlot = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    await Slot.findByIdAndDelete(req.params.id);
    res.json({ message: "Slot deleted" });
  } catch (err) {
    next(new AppError("Failed to delete slot", 500, "DELETE_SLOT_FAILED"));
  }
};

// ============================================================
// @desc    Get slots with booking info (Admin dashboard view)
// @route   GET /api/admin/slots
// @access  Admin
// ============================================================
export const getSlotsForAdminUX = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    const { date, page = 1, limit = 20, search, status } = req.query;
    const skip = (page - 1) * limit;
    const pipeline = [];

    // Match stage
    const matchStage = {};
    if (date) matchStage.date = date;
    if (search) {
      const regex = new RegExp(search, "i");
      matchStage.$or = [{ time: regex }];
    }
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Lookup bookings
    pipeline.push({
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "slotId",
        as: "bookings",
      },
    });

    const nowInCambodia = dayjs().tz("Asia/Phnom_Penh").toDate();

    // Add booked, expired, status
    pipeline.push({
      $addFields: {
        booked: {
          $anyElementTrue: {
            $map: {
              input: "$bookings",
              as: "b",
              in: { $eq: ["$$b.status", "confirmed"] },
            },
          },
        },
        expired: {
          $lt: [
            {
              $dateFromString: {
                dateString: { $concat: ["$date", "T", "$time", ":00"] },
                timezone: "Asia/Phnom_Penh",
              },
            },
            nowInCambodia,
          ],
        },
      },
    });

    pipeline.push({
      $addFields: {
        status: {
          $cond: [
            "$expired",
            "expired",
            { $cond: ["$booked", "booked", "available"] },
          ],
        },
      },
    });

    if (status) pipeline.push({ $match: { status } });

    pipeline.push({
      $project: {
        _id: 1,
        date: 1,
        time: 1,
        bookings: 1,
        status: 1,
      },
    });

    pipeline.push({
      $addFields: {
        statusPriority: {
          $switch: {
            branches: [
              { case: { $eq: ["$status", "available"] }, then: 1 },
              { case: { $eq: ["$status", "booked"] }, then: 2 },
              { case: { $eq: ["$status", "expired"] }, then: 3 },
            ],
            default: 99,
          },
        },
      },
    });

    pipeline.push({ $sort: { statusPriority: 1, date: 1, time: 1 } });

    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Slot.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    pipeline.push({ $skip: Number(skip) });
    pipeline.push({ $limit: Number(limit) });

    const slots = await Slot.aggregate(pipeline);

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      slots,
    });
  } catch (err) {
    next(new AppError("Failed to get slots", 500, "GET_ADMIN_SLOTS_FAILED"));
  }
};

// ============================================================
// @desc    Get only available slots for user (no booked or expired)
// @route   GET /api/user/slots/available
// @access  User
// ============================================================
export const getAvailableSlotsForUser = async (req, res, next) => {
  try {
    const userId = req.user.id; // Only store userId in Booking
    const nowInCambodia = dayjs().tz("Asia/Phnom_Penh");
    const { date } = req.query;

    const query = {};
    if (date) query.date = date;

    const slots = await Slot.find(query).lean();
    const slotIds = slots.map((s) => s._id);

    // Only check bookings by userId
    const bookings = await Booking.find({ slotId: { $in: slotIds } }).lean();

    const availableSlots = slots
      .filter((slot) => {
        const slotBookings = bookings.filter(
          (b) => b.slotId.toString() === slot._id.toString()
        );

        // Exclude if current user already booked
        if (slotBookings.some((b) => b.userId.toString() === userId))
          return false;

        // Exclude if any confirmed booking exists
        if (slotBookings.some((b) => b.status === "confirmed")) return false;

        // Exclude if slot is expired
        const slotDateTime = dayjs(`${slot.date}T${slot.time}:00`).tz(
          "Asia/Phnom_Penh"
        );
        if (slotDateTime.isBefore(nowInCambodia)) return false;

        return true;
      })
      .map((s) => ({ ...s, status: "available", canBook: true }));

    res.json({
      success: true,
      total: availableSlots.length,
      slots: availableSlots,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// @desc    Get available & booked slots for user (hide own bookings)
// @route   GET /api/user/slots
// @access  User
// ============================================================
export const getAvailableAndBookedSlotsForUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const nowInCambodia = dayjs().tz("Asia/Phnom_Penh");
    const { date, search, status } = req.query;

    const query = {};
    if (date) query.date = date;
    if (search) query.time = { $regex: search, $options: "i" };

    const slots = await Slot.find(query).lean();
    const slotIds = slots.map((s) => s._id);

    const bookings = await Booking.find({ slotId: { $in: slotIds } }).lean();

    const filteredSlots = slots
      .map((slot) => {
        const slotBookings = bookings.filter(
          (b) => b.slotId.toString() === slot._id.toString()
        );

        // Skip slot if user already booked it
        if (slotBookings.some((b) => b.userId.toString() === userId))
          return null;

        // Mark as booked if any other confirmed booking exists
        const othersConfirmed = slotBookings.some(
          (b) => b.userId.toString() !== userId && b.status === "confirmed"
        );

        const slotDateTime = dayjs(`${slot.date}T${slot.time}:00`).tz(
          "Asia/Phnom_Penh"
        );
        if (slotDateTime.isBefore(nowInCambodia)) return null;

        return {
          ...slot,
          status: othersConfirmed ? "booked" : "available",
          canBook: !othersConfirmed,
        };
      })
      .filter(Boolean);

    const result = status
      ? filteredSlots.filter((slot) => slot.status === status)
      : filteredSlots;

    result.sort((a, b) => {
      if (a.status !== b.status) return a.status === "available" ? -1 : 1;
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    res.json({
      success: true,
      total: result.length,
      slots: result,
    });
  } catch (err) {
    next(err);
  }
};

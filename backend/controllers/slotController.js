import Booking from "../models/Booking.js";
import Slot from "../models/Slot.js";
import AppError from "../utils/errors.js";
import { formatSlotResponse, isSlotExpired } from "../utils/slotHelpers.js";

function requireAdmin(req, next) {
  if (req.user.role !== "admin") {
    next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    return false;
  }
  return true;
}

function buildSlotSearchRegex(search) {
  const regex = new RegExp(search, "i");
  return {
    $or: [
      { gameTitle: regex },
      { description: regex },
      { time: regex },
      { date: regex },
    ],
  };
}

function parseSlotBody(body, file) {
  const data = {
    gameTitle: body.gameTitle?.trim(),
    description: body.description || "",
    date: body.date,
    time: body.time,
    price: body.price !== undefined ? Number(body.price) : 0,
    maxPlayers: body.maxPlayers !== undefined ? Number(body.maxPlayers) : 1,
  };

  if (body.status) data.status = body.status;
  if (file) data.gameImage = `/uploads/${file.filename}`;

  return data;
}

async function hasActiveBooking(slotId) {
  return Booking.exists({
    slotId,
    status: { $in: ["pending", "confirmed"] },
  });
}

// ============================================================
// @desc    Get all slots (legacy)
// @route   GET /slots
// ============================================================
export const getAllSlots = async (req, res, next) => {
  try {
    const slots = await Slot.find().sort({ date: 1, time: 1 });
    res.json(slots);
  } catch (err) {
    next(new AppError("Failed to get slots", 500, "GET_SLOTS_FAILED"));
  }
};

// ============================================================
// @desc    Create PS5 game slot (Admin)
// @route   POST /slots/admin
// ============================================================
export const createSlot = async (req, res, next) => {
  try {
    if (!requireAdmin(req, next)) return;

    if (!req.file) {
      return next(
        new AppError("Game image is required", 400, "IMAGE_REQUIRED")
      );
    }

    const data = parseSlotBody(req.body, req.file);
    if (!data.gameTitle || !data.date || !data.time) {
      return next(
        new AppError(
          "Game title, date, and time are required",
          400,
          "VALIDATION_ERROR"
        )
      );
    }

    const slot = await Slot.create({
      ...data,
      status: "available",
      createdBy: req.user.id,
    });

    res.status(201).json({
      message: "Slot created successfully",
      slot,
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(
        new AppError(
          "A slot with this date and time already exists",
          400,
          "DUPLICATE_SLOT"
        )
      );
    }
    next(new AppError("Failed to create slot", 500, "CREATE_SLOT_FAILED"));
  }
};

// ============================================================
// @desc    Update slot (Admin)
// @route   PATCH /slots/admin/:id
// ============================================================
export const updateSlot = async (req, res, next) => {
  try {
    if (!requireAdmin(req, next)) return;

    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return next(new AppError("Slot not found", 404, "SLOT_NOT_FOUND"));
    }

    const updates = parseSlotBody(req.body, req.file);
    const activeBooking = await hasActiveBooking(slot._id);

    if (
      activeBooking &&
      ((updates.date && updates.date !== slot.date) ||
        (updates.time && updates.time !== slot.time))
    ) {
      return next(
        new AppError(
          "Cannot change date/time while an active booking exists",
          400,
          "SLOT_HAS_ACTIVE_BOOKING"
        )
      );
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && updates[key] !== null) {
        slot[key] = updates[key];
      }
    });

    await slot.save();

    res.json({
      message: "Slot updated successfully",
      slot,
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(
        new AppError(
          "A slot with this date and time already exists",
          400,
          "DUPLICATE_SLOT"
        )
      );
    }
    next(new AppError("Failed to update slot", 500, "UPDATE_SLOT_FAILED"));
  }
};

// ============================================================
// @desc    Disable slot (Admin soft delete)
// @route   DELETE /slots/admin/:id
// ============================================================
export const deleteSlot = async (req, res, next) => {
  try {
    if (!requireAdmin(req, next)) return;

    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return next(new AppError("Slot not found", 404, "SLOT_NOT_FOUND"));
    }

    const activeBooking = await hasActiveBooking(slot._id);
    if (activeBooking) {
      return next(
        new AppError(
          "Cannot disable slot with an active booking",
          400,
          "SLOT_HAS_ACTIVE_BOOKING"
        )
      );
    }

    slot.status = "disabled";
    await slot.save();

    res.json({ message: "Slot disabled successfully", slot });
  } catch (err) {
    next(new AppError("Failed to disable slot", 500, "DELETE_SLOT_FAILED"));
  }
};

// ============================================================
// @desc    Get all slots (Admin)
// @route   GET /slots/admin
// ============================================================
export const getSlotsForAdminUX = async (req, res, next) => {
  try {
    if (!requireAdmin(req, next)) return;

    const { date, page = 1, limit = 20, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {};
    if (date) query.date = date;
    if (status) query.status = status;
    if (search) Object.assign(query, buildSlotSearchRegex(search));

    const [slots, total] = await Promise.all([
      Slot.find(query)
        .sort({ createdAt: -1, date: 1, time: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Slot.countDocuments(query),
    ]);

    const enriched = slots.map((slot) => ({
      ...slot,
      expired: isSlotExpired(slot),
    }));

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      slots: enriched,
    });
  } catch (err) {
    next(new AppError("Failed to get slots", 500, "GET_ADMIN_SLOTS_FAILED"));
  }
};

// ============================================================
// @desc    Get available PS5 slots for user
// @route   GET /slots/user/available
// ============================================================
export const getAvailableSlotsForUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = { status: "available" };
    if (date) query.date = date;
    if (search) Object.assign(query, buildSlotSearchRegex(search));

    const slots = await Slot.find(query).sort({ date: 1, time: 1 }).lean();

    const userBookings = await Booking.find({
      userId,
      status: { $in: ["pending", "confirmed"] },
    })
      .select("slotId")
      .lean();
    const bookedByUser = new Set(userBookings.map((b) => b.slotId.toString()));

    const availableSlots = slots
      .filter((slot) => !bookedByUser.has(slot._id.toString()))
      .filter((slot) => !isSlotExpired(slot))
      .map((slot) => ({ ...slot, status: "available" }));

    const total = availableSlots.length;
    const paged = availableSlots.slice(skip, skip + Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      slots: paged,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// @desc    Get available slots for user UX (legacy listing)
// @route   GET /slots/user
// ============================================================
export const getAvailableAndBookedSlotsForUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date, search, status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = { status: { $ne: "disabled" } };
    if (date) query.date = date;
    if (search) Object.assign(query, buildSlotSearchRegex(search));

    const slots = await Slot.find(query).sort({ date: 1, time: 1 }).lean();

    const userBookings = await Booking.find({
      userId,
      status: { $in: ["pending", "confirmed"] },
    })
      .select("slotId")
      .lean();
    const bookedByUser = new Set(userBookings.map((b) => b.slotId.toString()));

    const mapped = slots
      .filter((slot) => !bookedByUser.has(slot._id.toString()))
      .filter((slot) => !isSlotExpired(slot))
      .map((slot) => ({
        ...slot,
        status: slot.status === "available" ? "available" : "booked",
        canBook: slot.status === "available",
      }));

    const result = status
      ? mapped.filter((slot) => slot.status === status)
      : mapped;

    const total = result.length;
    const paged = result.slice(skip, skip + Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      slots: paged,
    });
  } catch (err) {
    next(err);
  }
};

export { formatSlotResponse };

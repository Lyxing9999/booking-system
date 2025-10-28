import Booking from "../models/Booking.js";
import Slot from "../models/Slot.js";
import User from "../models/User.js";
import AppError from "../utils/errors.js";
import { sendBookingEmail } from "../utils/mailer.js";
import { paginatePipeline } from "../utils/mongoHelpers.js";
/* ========================= USER BOOKINGS ========================= */

// ============================================================
// @desc    Create booking
// @route   POST /api/bookings
// @access  User
// ============================================================

export const createBooking = async (req, res, next) => {
  try {
    const { slotId, notes } = req.body;
    const userId = req.user.id;

    const slot = await Slot.findById(slotId);
    if (!slot)
      return next(new AppError("Slot not found", 404, "SLOT_NOT_FOUND"));

    const existingBooking = await Booking.findOne({ userId, slotId });
    if (existingBooking)
      return next(new AppError("Duplicate booking", 400, "DUPLICATE_BOOKING"));

    const approvedBooking = await Booking.findOne({
      slotId,
      status: "approved",
    });
    if (approvedBooking)
      return next(
        new AppError("Slot already approved", 400, "SLOT_ALREADY_APPROVED")
      );

    const booking = await Booking.create({
      slotId,
      userId,
      orderId: "ORD-" + Date.now(),
      notes,
      status: "pending",
    });

    res
      .status(201)
      .json({ success: true, message: "Booking created", booking });
  } catch (err) {
    next(
      new AppError("Failed to create booking", 500, "CREATE_BOOKING_FAILED")
    );
  }
};

// ============================================================
// @desc    Update booking
// @route   PATCH /api/bookings/:id
// @access  User
// ============================================================

export const updateBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { slotId, notes } = req.body;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId);
    if (!booking)
      return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
    if (booking.userId.toString() !== userId)
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    if (booking.status === "confirmed")
      return next(
        new AppError(
          "Cannot update confirmed booking",
          400,
          "BOOKING_CONFIRMED"
        )
      );

    if (slotId && slotId !== booking.slotId.toString()) {
      const slot = await Slot.findById(slotId);
      if (!slot)
        return next(new AppError("Slot not found", 404, "SLOT_NOT_FOUND"));

      const duplicate = await Booking.findOne({ userId, slotId });
      if (duplicate)
        return next(
          new AppError("Duplicate booking", 400, "DUPLICATE_BOOKING")
        );

      booking.slotId = slotId;
    }

    booking.notes = notes ?? booking.notes;
    await booking.save();

    res.json({ success: true, message: "Booking updated", booking });
  } catch (err) {
    next(
      new AppError("Failed to update booking", 500, "UPDATE_BOOKING_FAILED")
    );
  }
};

// ============================================================
// @desc     user bookings
// @route   GET /api/bookings/user
// @access  User
// ============================================================

export const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, date, search, status } = req.query;

    const query = { userId };

    const bookings = await Booking.find(query)
      .populate({
        path: "slotId",
        match: {
          ...(date ? { date } : {}),
          ...(search ? { time: { $regex: search, $options: "i" } } : {}),
        },
      })
      .lean();
    const filtered = bookings.filter((b) => b.slotId);

    let simplified = filtered.map((b) => ({
      _id: b._id,
      orderId: b.orderId,
      date: b.slotId.date,
      time: b.slotId.time,
      status: b.status,
      hasBook: b.status === "confirmed",
      cancelled: b.status === "cancelled",
      notes: b.notes || "",
    }));

    if (status) simplified = simplified.filter((b) => b.status === status);

    const order = { pending: 1, confirmed: 2, cancelled: 3 };
    simplified.sort((a, b) => order[a.status] - order[b.status]);

    const start = (page - 1) * limit;
    const paged = simplified.slice(start, start + Number(limit));

    res.json({
      success: true,
      total: simplified.length,
      page: Number(page),
      limit: Number(limit),
      bookings: paged,
    });
  } catch (err) {
    next(new AppError("Failed to fetch bookings", 500, "GET_BOOKINGS_FAILED"));
  }
};

// ============================================================
// @desc     delete booking
// @route   DELETE /api/bookings/:id
// @access  User
// ============================================================
export const deleteBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId);
    if (!booking)
      return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
    if (booking.userId.toString() !== userId)
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    if (booking.status === "confirmed")
      return next(
        new AppError(
          "Cannot delete confirmed booking",
          400,
          "BOOKING_CONFIRMED"
        )
      );

    await Booking.findByIdAndDelete(bookingId);
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (err) {
    next(
      new AppError("Failed to delete booking", 500, "DELETE_BOOKING_FAILED")
    );
  }
};

/* ========================= ADMIN BOOKINGS ========================= */
// ============================================================
// @desc    Update booking status (Admin)
// @route   PATCH /api/admin/bookings/:id/status
// @access  Admin
// ============================================================

export const updateBookingStatus = async (req, res, next) => {
  try {
    if (req.user.role !== "admin")
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));

    const { status } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking)
      return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));

    const slot = await Slot.findById(booking.slotId);
    if (!slot)
      return next(new AppError("Slot not found", 404, "SLOT_NOT_FOUND"));

    // Handle confirmed status
    if (status === "confirmed") {
      const existingConfirmed = await Booking.findOne({
        slotId: booking.slotId,
        status: "confirmed",
        _id: { $ne: booking._id },
      });

      if (existingConfirmed)
        return next(
          new AppError("Slot already confirmed", 400, "SLOT_ALREADY_CONFIRMED")
        );

      booking.status = "confirmed";
      await booking.save();
      const otherBookings = await Booking.find({
        slotId: booking.slotId,
        _id: { $ne: booking._id },
        status: { $ne: "cancelled" },
      }).lean();

      await Promise.all(
        otherBookings.map(async (b) => {
          await Booking.findByIdAndUpdate(b._id, { status: "cancelled" });

          const user = await User.findById(b.userId);
          if (user?.email) {
            try {
              await sendBookingEmail(
                user.email,
                user.name,
                slot.date,
                slot.time,
                b.orderId,
                "Cancelled"
              );
            } catch (err) {
              console.error(`Failed to send email to ${user.email}:`, err);
            }
          }
        })
      );

      const user = await User.findById(booking.userId);
      if (user?.email) {
        try {
          await sendBookingEmail(
            user.email,
            user.name,
            slot.date,
            slot.time,
            booking.orderId,
            "Confirmed"
          );
        } catch (err) {
          console.error(`Failed to send email to ${user.email}:`, err);
        }
      }
    }
    // Handle cancelled or pending
    else {
      booking.status = status;
      await booking.save();

      if (status === "cancelled") {
        const user = await User.findById(booking.userId);
        if (user?.email) {
          try {
            await sendBookingEmail(
              user.email,
              user.name,
              slot.date,
              slot.time,
              booking.orderId,
              "Cancelled"
            );
          } catch (err) {
            console.error(`Failed to send email to ${user.email}:`, err);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking,
    });
  } catch (err) {
    console.error("Error in updateBookingStatus:", err);
    next(
      new AppError(
        "Failed to update booking status",
        500,
        "UPDATE_BOOKING_STATUS_FAILED"
      )
    );
  }
};

// ============================================================
// @desc    Get all bookings (Admin view, paginated, searchable)
// @route   GET /api/admin/bookings
// @access  Admin
// ============================================================

export const getAdminBookings = async (req, res, next) => {
  try {
    if (req.user.role !== "admin")
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));

    const { page = 1, limit = 20, date, search, status } = req.query;
    const pipeline = [];

    if (status) pipeline.push({ $match: { status } });

    pipeline.push(
      {
        $lookup: {
          from: "slots",
          localField: "slotId",
          foreignField: "_id",
          as: "slot",
        },
      },
      { $unwind: "$slot" },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" }
    );

    if (date) pipeline.push({ $match: { "slot.date": date } });

    if (search) {
      const regex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { "user.name": regex },
            { "user.email": regex },
            { orderId: regex },
            { "slot.date": regex },
            { "slot.time": regex },
          ],
        },
      });
    }

    pipeline.push(
      {
        $addFields: {
          statusPriority: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "pending"] }, then: 1 },
                { case: { $eq: ["$status", "confirmed"] }, then: 2 },
                { case: { $eq: ["$status", "cancelled"] }, then: 3 },
              ],
              default: 99,
            },
          },
        },
      },
      {
        $sort: {
          statusPriority: 1,
          "slot.date": 1,
          "slot.time": 1,
          createdAt: 1,
        },
      },
      {
        $project: {
          _id: 1,
          orderId: 1,
          status: 1,
          notes: 1,
          createdAt: 1,
          updatedAt: 1,
          slot: { date: 1, time: 1 },
          user: { _id: 1, name: 1, email: 1 },
        },
      }
    );

    const totalResult = await Booking.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    const total = totalResult[0]?.total || 0;

    const bookings = await Booking.aggregate(
      paginatePipeline(pipeline, page, limit)
    );

    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      bookings,
    });
  } catch (err) {
    console.error("Error in getAdminBookings:", err);
    next(
      new AppError(
        "Failed to get admin bookings",
        500,
        "GET_ADMIN_BOOKINGS_FAILED"
      )
    );
  }
};

// ============================================================
// @desc    Get all confirmed bookings (Admin view, paginated, searchable)
// @route   GET /api/admin/bookings/confirmed
// @access  Admin
// ============================================================

export const getAdminConfirmedBookings = async (req, res, next) => {
  try {
    if (req.user.role !== "admin")
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));

    const { page = 1, limit = 20, date, search } = req.query;

    const pipeline = [
      { $match: { status: "confirmed" } },
      {
        $lookup: {
          from: "slots",
          localField: "slotId",
          foreignField: "_id",
          as: "slot",
        },
      },
      { $unwind: "$slot" },
      ...(date ? [{ $match: { "slot.date": date } }] : []),
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
    ];
    if (search) {
      const regex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { "user.name": regex },
            { "user.email": regex },
            { orderId: regex },
            { "slot.date": regex },
            { "slot.time": regex },
          ],
        },
      });
    }
    pipeline.push({ $sort: { "slot.date": 1, "slot.time": 1 } });
    const totalResult = await Booking.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    const total = totalResult[0]?.total || 0;
    const bookings = await Booking.aggregate(
      paginatePipeline(pipeline, page, limit)
    );
    res.json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      bookings,
    });
  } catch (err) {
    console.error("Error in getAdminConfirmedBookings:", err);
    next(
      new AppError(
        "Failed to get confirmed bookings",
        500,
        "GET_CONFIRMED_BOOKINGS_FAILED"
      )
    );
  }
};

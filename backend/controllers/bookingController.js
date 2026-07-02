import Booking from "../models/Booking.js";
import Slot from "../models/Slot.js";
import User from "../models/User.js";
import AppError from "../utils/errors.js";
import { sendBookingEmail } from "../utils/mailer.js";
import { paginatePipeline } from "../utils/mongoHelpers.js";
import { generateOrderId } from "../utils/orderId.js";

/* ========================= USER BOOKINGS ========================= */

export const createBooking = async (req, res, next) => {
  try {
    const { slotId, notes } = req.body;
    const userId = req.user.id;

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return next(new AppError("Slot not found", 404, "SLOT_NOT_FOUND"));
    }
    if (slot.status === "disabled") {
      return next(new AppError("Slot is disabled", 400, "SLOT_DISABLED"));
    }
    if (slot.status !== "available") {
      return next(new AppError("Slot is not available", 400, "SLOT_NOT_AVAILABLE"));
    }

    const existingBooking = await Booking.findOne({
      userId,
      slotId,
      status: { $ne: "cancelled" },
    });
    if (existingBooking) {
      return next(new AppError("Duplicate booking", 400, "DUPLICATE_BOOKING"));
    }

    const activeOnSlot = await Booking.findOne({
      slotId,
      status: { $in: ["pending", "confirmed"] },
    });
    if (activeOnSlot) {
      return next(
        new AppError("Slot already has an active booking", 400, "SLOT_ALREADY_BOOKED")
      );
    }

    const orderId = await generateOrderId(Booking);

    const booking = await Booking.create({
      slotId,
      userId,
      orderId,
      notes: notes || "",
      status: "pending",
    });

    slot.status = "booked";
    await slot.save();

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking: {
        _id: booking._id,
        orderId: booking.orderId,
        status: booking.status,
      },
    });
  } catch (err) {
    next(
      new AppError("Failed to create booking", 500, "CREATE_BOOKING_FAILED")
    );
  }
};

export const updateBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { slotId, notes } = req.body;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
    }
    if (booking.userId.toString() !== userId) {
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    }
    if (booking.status !== "pending") {
      return next(
        new AppError(
          "Only pending bookings can be edited",
          400,
          "BOOKING_NOT_PENDING"
        )
      );
    }

    const oldSlotId = booking.slotId.toString();

    if (slotId && slotId !== oldSlotId) {
      const newSlot = await Slot.findById(slotId);
      if (!newSlot) {
        return next(new AppError("Slot not found", 404, "SLOT_NOT_FOUND"));
      }
      if (newSlot.status !== "available") {
        return next(
          new AppError("New slot is not available", 400, "SLOT_NOT_AVAILABLE")
        );
      }

      const duplicate = await Booking.findOne({
        userId,
        slotId,
        status: { $ne: "cancelled" },
        _id: { $ne: booking._id },
      });
      if (duplicate) {
        return next(new AppError("Duplicate booking", 400, "DUPLICATE_BOOKING"));
      }

      await Slot.findByIdAndUpdate(oldSlotId, { status: "available" });
      newSlot.status = "booked";
      await newSlot.save();
      booking.slotId = slotId;
    }

    if (notes !== undefined) booking.notes = notes;
    await booking.save();

    const populated = await Booking.findById(booking._id).populate("slotId");

    res.json({ success: true, message: "Booking updated", booking: populated });
  } catch (err) {
    next(
      new AppError("Failed to update booking", 500, "UPDATE_BOOKING_FAILED")
    );
  }
};

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
          ...(search
            ? {
                $or: [
                  { gameTitle: { $regex: search, $options: "i" } },
                  { time: { $regex: search, $options: "i" } },
                  { description: { $regex: search, $options: "i" } },
                ],
              }
            : {}),
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    let filtered = bookings.filter((b) => b.slotId);

    if (status) filtered = filtered.filter((b) => b.status === status);

    const order = { pending: 1, confirmed: 2, cancelled: 3 };
    filtered.sort((a, b) => order[a.status] - order[b.status]);

    const simplified = filtered.map((b) => ({
      _id: b._id,
      orderId: b.orderId,
      status: b.status,
      notes: b.notes || "",
      date: b.slotId.date,
      time: b.slotId.time,
      gameTitle: b.slotId.gameTitle,
      gameImage: b.slotId.gameImage,
      price: b.slotId.price,
      slotId: b.slotId,
    }));

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

export const deleteBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
    }
    if (booking.userId.toString() !== userId) {
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    }
    if (booking.status !== "pending") {
      return next(
        new AppError(
          "Only pending bookings can be cancelled",
          400,
          "BOOKING_NOT_PENDING"
        )
      );
    }

    booking.status = "cancelled";
    booking.cancelledBy = "user";
    booking.cancelledAt = new Date();
    await booking.save();

    await Slot.findByIdAndUpdate(booking.slotId, { status: "available" });

    res.json({ success: true, message: "Booking cancelled successfully" });
  } catch (err) {
    next(
      new AppError("Failed to cancel booking", 500, "DELETE_BOOKING_FAILED")
    );
  }
};

/* ========================= ADMIN BOOKINGS ========================= */

export const updateBookingStatus = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    const { status, cancelledReason } = req.body;
    const bookingId = req.params.id;

    if (!["confirmed", "cancelled"].includes(status)) {
      return next(new AppError("Invalid status", 400, "INVALID_STATUS"));
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError("Booking not found", 404, "BOOKING_NOT_FOUND"));
    }
    if (booking.status === "cancelled") {
      return next(
        new AppError("Cannot update a cancelled booking", 400, "BOOKING_CANCELLED")
      );
    }

    const slot = await Slot.findById(booking.slotId);
    if (!slot) {
      return next(new AppError("Slot not found", 404, "SLOT_NOT_FOUND"));
    }

    if (status === "confirmed") {
      if (booking.status !== "pending") {
        return next(
          new AppError("Only pending bookings can be confirmed", 400, "INVALID_STATUS")
        );
      }
      booking.status = "confirmed";
      booking.confirmedAt = new Date();
      slot.status = "booked";
    } else if (status === "cancelled") {
      booking.status = "cancelled";
      booking.cancelledBy = "admin";
      booking.cancelledReason = cancelledReason || "";
      booking.cancelledAt = new Date();
      slot.status = "available";
    }

    await booking.save();
    await slot.save();

    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking,
    });

    (async () => {
      try {
        const user = await User.findById(booking.userId);
        if (!user?.email) return;

        const label = status === "confirmed" ? "Confirmed" : "Cancelled";
        await sendBookingEmail(
          user.email,
          user.name,
          slot.date,
          slot.time,
          booking.orderId,
          label
        );
      } catch (err) {
        console.error("Background email failed:", err);
      }
    })();
  } catch (err) {
    next(
      new AppError(
        "Failed to update booking status",
        500,
        "UPDATE_BOOKING_STATUS_FAILED"
      )
    );
  }
};

export const getAdminBookings = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

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
            { "slot.gameTitle": regex },
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
          slot: {
            _id: 1,
            date: 1,
            time: 1,
            gameTitle: 1,
            gameImage: 1,
            price: 1,
            description: 1,
          },
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
    next(
      new AppError(
        "Failed to get admin bookings",
        500,
        "GET_ADMIN_BOOKINGS_FAILED"
      )
    );
  }
};

export const getAdminConfirmedBookings = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

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
            { "slot.gameTitle": regex },
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
    next(
      new AppError(
        "Failed to get confirmed bookings",
        500,
        "GET_CONFIRMED_BOOKINGS_FAILED"
      )
    );
  }
};

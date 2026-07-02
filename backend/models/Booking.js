import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
      default: "",
    },
    cancelledBy: {
      type: String,
      enum: ["user", "admin", null],
      default: null,
    },
    cancelledReason: {
      type: String,
      default: "",
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

BookingSchema.index({ slotId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);

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
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Optional: enforce uniqueness of a user booking per slot
BookingSchema.index({ slotId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);

import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    gameTitle: {
      type: String,
      required: true,
      trim: true,
    },
    gameImage: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    maxPlayers: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ["available", "booked", "disabled"],
      default: "available",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

slotSchema.index({ date: 1, time: 1 }, { unique: true });

export default mongoose.models.Slot || mongoose.model("Slot", slotSchema);

import mongoose from "mongoose";

const slotSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
});

export default mongoose.models.Slot || mongoose.model("Slot", slotSchema);

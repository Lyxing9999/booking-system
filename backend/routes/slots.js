import express from "express";
import {
  getAllSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  getAvailableAndBookedSlotsForUser,
  getAvailableSlotsForUser,
  getSlotsForAdminUX,
} from "../controllers/slotController.js";
import { authenticate, adminMiddleware } from "../middleware/auth.js";
import { uploadGameImage } from "../middleware/upload.js";

const router = express.Router();

router.get("/", getAllSlots);

router.get("/user", authenticate, getAvailableAndBookedSlotsForUser);
router.get("/user/available", authenticate, getAvailableSlotsForUser);

router.get("/admin", authenticate, adminMiddleware, getSlotsForAdminUX);
router.post(
  "/admin",
  authenticate,
  adminMiddleware,
  uploadGameImage.single("gameImage"),
  createSlot
);
router.patch(
  "/admin/:id",
  authenticate,
  adminMiddleware,
  uploadGameImage.single("gameImage"),
  updateSlot
);
router.delete("/admin/:id", authenticate, adminMiddleware, deleteSlot);

// Legacy routes kept for backward compatibility
router.post("/", authenticate, adminMiddleware, uploadGameImage.single("gameImage"), createSlot);
router.put(
  "/:id",
  authenticate,
  adminMiddleware,
  uploadGameImage.single("gameImage"),
  updateSlot
);
router.delete("/:id", authenticate, adminMiddleware, deleteSlot);

export default router;

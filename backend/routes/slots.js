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
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Slots
 *   description: Slot management routes
 */

/* --------------------- Public/Admin --------------------- */

/**
 * @swagger
 * /api/slots:
 *   get:
 *     summary: Get all slots (Admin/User)
 *     tags: [Slots]
 *     responses:
 *       200:
 *         description: List of all slots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Slot'
 */
router.get("/", getAllSlots);

/* --------------------- User Slots --------------------- */

/**
 * @swagger
 * /api/slots/user:
 *   get:
 *     summary: Get available & booked slots for user UX
 *     tags: [Slots]
 *     responses:
 *       200:
 *         description: List of slots with availability
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SlotUserView'
 */
router.get("/user", authenticate, getAvailableAndBookedSlotsForUser);

/**
 * @swagger
 * /api/slots/user/available:
 *   get:
 *     summary: Get only available slots for user
 *     tags: [Slots]
 *     responses:
 *       200:
 *         description: List of available slots
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SlotUserView'
 */
router.get("/user/available", authenticate, getAvailableSlotsForUser);

/* --------------------- Admin Slots --------------------- */

/**
 * @swagger
 * /api/slots/admin:
 *   get:
 *     summary: Get all slots with admin view (availability + bookings)
 *     tags: [Slots]
 *     responses:
 *       200:
 *         description: List of slots with bookings and status
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SlotAdminView'
 */
router.get("/admin", authenticate, getSlotsForAdminUX);

/**
 * @swagger
 * /api/slots:
 *   post:
 *     summary: Create a new slot (Admin only)
 *     tags: [Slots]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SlotInput'
 *     responses:
 *       201:
 *         description: Slot created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Slot'
 */
router.post("/", authenticate, createSlot);

/**
 * @swagger
 * /api/slots/{id}:
 *   put:
 *     summary: Update a slot (Admin only)
 *     tags: [Slots]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SlotInput'
 *     responses:
 *       200:
 *         description: Slot updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Slot'
 */
router.put("/:id", authenticate, updateSlot);

/**
 * @swagger
 * /api/slots/{id}:
 *   delete:
 *     summary: Delete a slot (Admin only)
 *     tags: [Slots]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Slot deleted
 */
router.delete("/:id", authenticate, deleteSlot);

/* --------------------- Schemas --------------------- */

/**
 * @swagger
 * components:
 *   schemas:
 *     Slot:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         date:
 *           type: string
 *         time:
 *           type: string
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 *     SlotInput:
 *       type: object
 *       required:
 *         - date
 *         - time
 *       properties:
 *         date:
 *           type: string
 *         time:
 *           type: string
 *     SlotUserView:
 *       allOf:
 *         - $ref: '#/components/schemas/Slot'
 *         - type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [available, booked]
 *             canBook:
 *               type: boolean
 *     SlotAdminView:
 *       allOf:
 *         - $ref: '#/components/schemas/Slot'
 *         - type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [available, booked, expired]
 *             bookings:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 */

export default router;

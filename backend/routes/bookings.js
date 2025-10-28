import express from "express";
import {
  createBooking,
  updateBookingStatus,
  getUserBookings,
  getAdminBookings,
  updateBooking,
  deleteBooking,
  getAdminConfirmedBookings,
} from "../controllers/bookingController.js";
import { authenticate, adminMiddleware } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management routes
 */

/**
 * @swagger
 * /api/bookings/user:
 *   get:
 *     summary: Get current user's bookings
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: List of user's bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 */
router.get("/user", authenticate, getUserBookings);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking (User only)
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingInput'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Duplicate booking or invalid data
 *       404:
 *         description: Slot or user not found
 */
router.post("/", authenticate, createBooking);

/**
 * @swagger
 * /api/bookings/user/{bookingId}:
 *   patch:
 *     summary: Update current user's booking
 *     tags: [Bookings]
 *     parameters:
 *       - name: bookingId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slotId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Cannot update confirmed booking
 *       403:
 *         description: Forbidden (not owner)
 */
router.patch("/user/:bookingId", authenticate, updateBooking);

/**
 * @swagger
 * /api/bookings/user/{id}:
 *   delete:
 *     summary: Delete current user's booking
 *     tags: [Bookings]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking deleted successfully
 *       403:
 *         description: Forbidden (not owner)
 *       400:
 *         description: Cannot delete confirmed booking
 */
router.delete("/user/:id", authenticate, deleteBooking);

/**
 * @swagger
 * /api/bookings/admin:
 *   get:
 *     summary: Get all bookings (Admin)
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: List of all bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 */
router.get("/admin", authenticate, adminMiddleware, getAdminBookings);

/**
 * @swagger
 * /api/bookings/admin/{id}/status:
 *   patch:
 *     summary: Update booking status (Admin only)
 *     tags: [Bookings]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled]
 *     responses:
 *       200:
 *         description: Booking status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
 */
router.patch(
  "/admin/:id/status",
  authenticate,
  adminMiddleware,
  updateBookingStatus
);

/**
 * @swagger
 * /api/bookings/admin/confirmed:
 *   get:
 *     summary: Get all confirmed bookings (Admin)
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: List of confirmed bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 */
router.get(
  "/admin/confirmed",
  authenticate,
  adminMiddleware,
  getAdminConfirmedBookings
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         slotId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             date:
 *               type: string
 *             time:
 *               type: string
 *         user:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         orderId:
 *           type: string
 *         notes:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, confirmed, cancelled, rejected]
 *     BookingInput:
 *       type: object
 *       required:
 *         - slotId
 *       properties:
 *         slotId:
 *           type: string
 *         notes:
 *           type: string
 */

export default router;

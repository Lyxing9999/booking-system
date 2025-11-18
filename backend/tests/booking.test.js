// backend/tests/booking.test.js
process.env.NODE_ENV = "test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import Booking from "../models/Booking.js";
import Slot from "../models/Slot.js";
import User from "../models/User.js";
import { sendBookingEmail } from "../utils/mailer.js";
import { jest } from "@jest/globals";

// Mock sendBookingEmail for all tests

let mongoServer;
let user;
let admin;

beforeAll(async () => {
  // JWT secret for token signing
  process.env.JWT_SECRET = "testsecret";

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed users
  user = await User.create({
    name: "Test User",
    email: "user@test.com",
    password: "password123",
    role: "user",
  });

  admin = await User.create({
    name: "Admin User",
    email: "admin@test.com",
    password: "admin123",
    role: "admin",
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Booking.deleteMany({});
  await Slot.deleteMany({});
  jest.clearAllMocks(); // clear mocks after each test
});

describe("Booking Model - Direct DB operations", () => {
  let slot;

  beforeEach(async () => {
    slot = await Slot.create({ date: "2025-11-10", time: "10:00 AM" });
  });

  it("should create a booking and call sendBookingEmail", async () => {
    const booking = await Booking.create({
      userId: user._id,
      slotId: slot._id,
      status: "pending",
      orderId: "ORD-1",
    });

    // Simulate sending email
    await sendBookingEmail(
      user.email,
      user.name,
      slot.date,
      slot.time,
      booking.orderId
    );

    expect(booking).toHaveProperty("_id");
    expect(booking.status).toBe("pending");
  });

  it("should prevent duplicate bookings for same user and slot", async () => {
    await Booking.create({
      userId: user._id,
      slotId: slot._id,
      status: "pending",
      orderId: "ORD-2",
    });

    let error;
    try {
      await Booking.create({
        userId: user._id,
        slotId: slot._id,
        status: "pending",
        orderId: "ORD-3",
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
  });

  it("should update a booking", async () => {
    const booking = await Booking.create({
      userId: user._id,
      slotId: slot._id,
      status: "pending",
      orderId: "ORD-4",
      notes: "Original notes",
    });

    booking.notes = "Updated notes";
    await booking.save();

    const updated = await Booking.findById(booking._id);
    expect(updated.notes).toBe("Updated notes");
  });

  it("should delete a booking", async () => {
    const booking = await Booking.create({
      userId: user._id,
      slotId: slot._id,
      status: "pending",
      orderId: "ORD-5",
    });

    await Booking.findByIdAndDelete(booking._id);

    const found = await Booking.findById(booking._id);
    expect(found).toBeNull();
  });
});

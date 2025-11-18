import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../server.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
let mongoServer;

beforeAll(async () => {
  // CRITICAL FIX: Define JWT secrets so that jwt.sign/verify don't fail,
  // causing the controller to throw a 500 error.
  process.env.JWT_SECRET = "testsecret";
  process.env.JWT_REFRESH_SECRET = "testrefreshsecret";

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe("Auth Controller", () => {
  // ===================== Register =====================
  it("should register a new user", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "John Doe",
      email: "john.doe@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data.user.name).toBe("John Doe");
    expect(res.body.data.user.email).toBe("john.doe@example.com");
    expect(res.body.data.user.role).toBe("user");
  });

  it("should not register with existing email", async () => {
    await User.create({
      name: "Existing User",
      email: "existing@example.com",
      password: "123456",
    });

    const res = await request(app).post("/auth/register").send({
      name: "New User",
      email: "existing@example.com",
      password: "password123",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email already exists");
  });

  it("should not register with existing name", async () => {
    await User.create({
      name: "John Doe",
      email: "john@example.com",
      password: "123456",
    });

    const res = await request(app).post("/auth/register").send({
      name: "John Doe",
      email: "new@example.com",
      password: "password123",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Name already exists");
  });

  // ===================== Login =====================
  it("should login a registered user", async () => {
    const user = new User({
      name: "Login User",
      email: "login@test.com",
      password: "password123",
    });
    await user.save();

    const res = await request(app).post("/auth/login").send({
      email: "login@test.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data.user.email).toBe("login@test.com");
  });

  it("should fail login with wrong password", async () => {
    const user = new User({
      name: "Login User",
      email: "login@test.com",
      password: "password123",
    });
    await user.save();

    const res = await request(app).post("/auth/login").send({
      email: "login@test.com",
      password: "wrongpass",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid email or password");
  });

  // ===================== Logout =====================
  it("should logout user and clear cookies", async () => {
    const res = await request(app).post("/auth/logout");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logout successful");
  });

  // ===================== Refresh Token =====================
  it("should refresh access token with valid refresh token", async () => {
    const user = new User({
      name: "Refresh User",
      email: "refresh@test.com",
      password: "password123",
    });
    await user.save();

    // create fake refresh token
    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_REFRESH_SECRET, // Use the now-defined secret
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    const res = await request(app)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=${refreshToken}`]);

    // FIX: Changed expected status from 201 to 200 (since controller defaults to 200)
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("accessToken");
  });

  it("should fail refresh token with invalid token", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .set("Cookie", [`refreshToken=invalidtoken`]);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Invalid or expired refresh token");
  });
});

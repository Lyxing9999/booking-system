// server.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { setupSwagger } from "./config/swagger.js";
import errorHandler from "./middleware/errorHandler.js";

// Routes
import userRoutes from "./routes/user.js";
import authRoutes from "./routes/auth.js";
import slotRoutes from "./routes/slots.js";
import bookingRoutes from "./routes/bookings.js";

// -------------------- Environment Variables --------------------
// In production, Render provides env vars, no need for .env file
dotenv.config();

const app = express();

// -------------------- Middlewares --------------------
app.use(express.json());
app.use(cookieParser());

// -------------------- CORS Setup --------------------
const allowedOrigins = [
  "http://localhost:3000",
  "https://booking-system-frontend-psi.vercel.app/",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy: Not allowed"));
      }
    },
    credentials: true, // allow cookies
  })
);

// -------------------- Routes --------------------
app.use("/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/slots", slotRoutes);
app.use("/bookings", bookingRoutes);

// -------------------- Swagger --------------------
setupSwagger(app);

// -------------------- Error Handling --------------------
app.use(errorHandler);

// -------------------- Database Connection --------------------
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  }
};

connectDB();

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`⚡ Server running on port ${PORT}`);
});

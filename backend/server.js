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

// Load environment variables
dotenv.config({ path: "./backend/.env" });

const app = express();

// -------------------- Middlewares --------------------
app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: "http://localhost:3000", // frontend origin
  credentials: true, // allow cookies
};
app.use(cors(corsOptions));

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
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (err) {
    process.stderr.write(`❌ MongoDB Connection Error: ${err.message}\n`);
    process.exit(1); // exit if DB fails to connect
  }
};

connectDB();

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  process.stdout.write(`⚡ Server running on port ${PORT}\n`);
});

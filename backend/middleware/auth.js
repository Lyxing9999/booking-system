import jwt from "jsonwebtoken";
import AppError from "../utils/errors.js";

export const authenticate = (req, res, next) => {
  // Get token from Authorization header or cookie
  const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;

  if (!token) {
    return next(new AppError("No token provided", 401, "NO_TOKEN"));
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return next(new AppError("Invalid token", 401, "INVALID_TOKEN"));
  }
};
export const onlyUser = (req, res, next) => {
  if (req.user.role !== "user") {
    return next(new AppError("Only users can create bookings", 403));
  }
  next();
};

export const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(
      new AppError("Only admins can access this route", 403, "NOT_ADMIN")
    );
  }
  next();
};

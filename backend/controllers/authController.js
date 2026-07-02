import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/errors.js";

/* ========================================================================
   AUTHENTICATION
   ======================================================================== */

const isProduction =
  process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging";

/* ============================================================
   Helper: Set cookie
============================================================ */
const setCookie = (res, name, value, maxAge) => {
  res.cookie(name, value, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge,
    path: "/",
  });
};

/* ============================================================
   Register a new user
============================================================ */
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (await User.findOne({ name })) {
      return next(new AppError("Name already exists", 400, "NAME_EXISTS"));
    }
    if (await User.findOne({ email })) {
      return next(new AppError("Email already exists", 400, "EMAIL_EXISTS"));
    }

    const user = new User({ name, email, password });
    await user.save();

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        token: accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          theme: user.theme || "ps5-default",
        },
      },
    });
  } catch (err) {
    next(new AppError("Failed to register user", 500, "REGISTER_USER_FAILED"));
  }
};

/* ============================================================
   Login user & issue tokens
============================================================ */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );

  // Save refresh token in DB
  user.refreshToken = refreshToken;
  await user.save();

  // Set cookies properly
  setCookie(res, "token", accessToken, 15 * 60 * 1000); // 15 min
  setCookie(res, "refreshToken", refreshToken, 7 * 24 * 60 * 60 * 1000); // 7 days

  res.json({
    status: "success",
    data: {
      token: accessToken,
      user: {
        id: user._id,
        role: user.role,
        email: user.email,
        name: user.name,
        theme: user.theme || "ps5-default",
      },
    },
  });
};

/* ============================================================
   Logout user (clear cookies)
============================================================ */
export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    res.status(500).json({ message: "Failed to logout" });
  }
};

/* ============================================================
   Refresh access token using refresh token
============================================================ */
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return next(new AppError("Invalid token", 403, "TOKEN_INVALID"));
    }

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const newRefreshToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );
    user.refreshToken = newRefreshToken;
    await user.save();

    setCookie(res, "token", newAccessToken, 15 * 60 * 1000);
    setCookie(res, "refreshToken", newRefreshToken, 7 * 24 * 60 * 60 * 1000);

    res.json({
      status: "success",
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    next(
      new AppError("Invalid or expired refresh token", 403, "TOKEN_INVALID"),
    );
  }
};

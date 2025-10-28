import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/errors.js";

/* ========================================================================
   AUTHENTICATION
   ======================================================================== */

// ============================================================
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ============================================================
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

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(new AppError("Failed to register user", 500, "REGISTER_USER_FAILED"));
  }
};

// ============================================================
// @desc    Login user & issue tokens
// @route   POST /api/auth/login
// @access  Public
// ============================================================
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return next(
        new AppError("Invalid email or password", 400, "INVALID_CREDENTIALS")
      );
    }
    const isProduction =
      process.env.NODE_ENV === "production" ||
      process.env.NODE_ENV === "staging";
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.status(200).json({
      status: "success",
      data: {
        token: accessToken,
        user: { id: user._id, role: user.role, email: user.email },
      },
    });
  } catch (err) {
    next(new AppError("Failed to login user", 500, "LOGIN_USER_FAILED"));
  }
};

// ============================================================
// @desc    Logout user (clear cookies)
// @route   POST /api/auth/logout
// @access  Private
// ============================================================
export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    res.status(500).json({ message: "Failed to logout" });
  }
};

// ============================================================
// @desc    Refresh access token using refresh token
// @route   POST /api/auth/refresh
// @access  Public (requires valid refresh token)
// ============================================================
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
      { id: decoded.id, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // new access token
    );

    res.json({
      status: "success",
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    next(
      new AppError("Invalid or expired refresh token", 403, "TOKEN_INVALID")
    );
  }
};

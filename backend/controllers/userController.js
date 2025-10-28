import User from "../models/User.js";
import Booking from "../models/Booking.js";
import AppError from "../utils/errors.js";
import bcrypt from "bcrypt";

// ============================================================
// @desc    Get current user's profile
// @route   GET /api/users/profile
// @access  User
// ============================================================
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    next(new AppError("Failed to get profile", 500, "GET_PROFILE_FAILED"));
  }
};

// ============================================================
// @desc    Update current user's profile (name, email, or password)
// @route   PATCH /api/users/profile
// @access  User
// ============================================================
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user)
      return next(new AppError("User not found", 404, "USER_NOT_FOUND"));

    const updateData = {};
    if (name) updateData.name = name;

    // Prevent updating both email and password at once
    if (email && newPassword) {
      return next(
        new AppError(
          "You can only update email OR password at a time",
          400,
          "EMAIL_OR_PASSWORD_ONLY"
        )
      );
    }

    // Email change
    if (email && email !== user.email) {
      if (!currentPassword) {
        return next(
          new AppError(
            "Current password required to change email",
            400,
            "PASSWORD_REQUIRED"
          )
        );
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return next(
          new AppError("Incorrect current password", 401, "INVALID_PASSWORD")
        );

      const existingUser = await User.findOne({ email });
      if (existingUser)
        return next(new AppError("Email already in use", 400, "EMAIL_EXISTS"));

      updateData.email = email;
    }
    if (newPassword) {
      if (!currentPassword) {
        return next(
          new AppError(
            "Current password required to change password",
            400,
            "PASSWORD_REQUIRED"
          )
        );
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return next(
          new AppError("Incorrect current password", 401, "INVALID_PASSWORD")
        );

      const samePassword = await bcrypt.compare(newPassword, user.password);
      if (samePassword)
        return next(
          new AppError(
            "New password cannot be the same as old password",
            400,
            "SAME_PASSWORD"
          )
        );

      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
    }).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    next(
      new AppError("Failed to update profile", 500, "UPDATE_PROFILE_FAILED")
    );
  }
};

// ============================================================
// @desc    Admin: Get all non-admin users with confirmed booking count
// @route   GET /api/admin/users
// @access  Admin
// ============================================================
export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { role: "user" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const usersWithBookingCount = await User.aggregate([
      { $match: query },
      { $sort: { name: 1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "bookings",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$userId"] }, // ✅ FIXED
                status: "confirmed", // only confirmed bookings
              },
            },
          ],
          as: "bookings",
        },
      },
      { $addFields: { bookingCount: { $size: "$bookings" } } },
      { $project: { password: 0, refreshToken: 0, bookings: 0 } },
    ]);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users: usersWithBookingCount,
      page: Number(page),
      limit: Number(limit),
      total,
    });
  } catch (err) {
    console.error("Error in getUsers:", err);
    next(new AppError("Failed to get users", 500, "GET_USERS_FAILED"));
  }
};

// ============================================================
// @desc    Admin: Create a new user (check duplicate name/email)
// @route   POST /api/admin/users
// @access  Admin
// ============================================================
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return next(
        new AppError(
          "Name, email, and password required",
          400,
          "REQUIRED_FIELDS"
        )
      );
    }

    if (await User.findOne({ name }))
      return next(new AppError("Name already exists", 400, "NAME_EXISTS"));
    if (await User.findOne({ email }))
      return next(new AppError("Email already exists", 400, "EMAIL_EXISTS"));

    const user = await User.create({
      name,
      email,
      password,
      role: role || "user",
    });

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: safeUser,
    });
  } catch (err) {
    next(new AppError("Failed to create user", 500, "CREATE_USER_FAILED"));
  }
};

// ============================================================
// @desc    Admin: Update any user (check duplicate name/email)
// @route   PUT /api/admin/users/:id
// @access  Admin
// ============================================================
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    const user = await User.findById(id);
    if (!user)
      return next(new AppError("User not found", 404, "USER_NOT_FOUND"));

    const updateData = {};

    if (name && name !== user.name) {
      if (await User.findOne({ name }))
        return next(new AppError("Name already exists", 400, "NAME_EXISTS"));
      updateData.name = name;
    }

    if (email && email !== user.email) {
      if (await User.findOne({ email }))
        return next(new AppError("Email already exists", 400, "EMAIL_EXISTS"));
      updateData.email = email;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    }).select("-password");

    const bookingCount = await Booking.countDocuments({
      "user._id": user._id,
      status: "confirmed",
    });

    res.json({
      success: true,
      message: "User updated successfully",
      user: { ...updatedUser.toObject(), bookingCount },
    });
  } catch (err) {
    next(new AppError("Failed to update user", 500, "UPDATE_USER_FAILED"));
  }
};

// ============================================================
// @desc    Admin: Delete user and their bookings
// @route   DELETE /api/admin/users/:id
// @access  Admin
// ============================================================
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user)
      return next(new AppError("User not found", 404, "USER_NOT_FOUND"));

    // Delete the user
    await user.deleteOne();

    // Delete all bookings for that user
    await Booking.deleteMany({ userId: id });

    res.json({
      success: true,
      message: "User and related bookings deleted successfully",
    });
  } catch (err) {
    next(new AppError("Failed to delete user", 500, "DELETE_USER_FAILED"));
  }
};

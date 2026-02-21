const { User, AnggotaSilat } = require("../models");
const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "your_jwt_secret_key",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
};

// Cookie options (shared between login and logout for consistency)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { nama, email, password, role, alamat, no_hp } = req.body;

    // Validate required fields
    if (!nama || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, and password are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Validate role
    const validRoles = ["admin", "user", "anggota"];
    const userRole = role || "user";
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be admin, user, or anggota",
      });
    }

    // Create user (password will be hashed automatically by User model hook)
    const user = await User.create({
      nama,
      email,
      password,
      role: userRole,
      alamat,
      no_hp,
    });

    // Remove password from response
    const userResponse = {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      alamat: user.alamat,
      no_hp: user.no_hp,
      createdAt: user.createdAt,
    };

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: userResponse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message,
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: AnggotaSilat,
          as: "anggotaSilat",
          required: false,
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Reset login attempts on success (if using rateLimitLogin)
    const { loginAttempts } = require("../middleware/authMiddleware");
    if (loginAttempts && typeof loginAttempts.delete === "function") {
      loginAttempts.delete(email);
    }

    // Generate token
    const token = generateToken(user);

    // Set token as httpOnly cookie
    res.cookie("token", token, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Prepare user response (no token in body)
    const userResponse = {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      alamat: user.alamat,
      no_hp: user.no_hp,
      foto: user.foto,
      foto_url: user.foto_url,
      tingkatan_sabuk: user.anggotaSilat
        ? user.anggotaSilat.tingkatan_sabuk
        : null,
    };

    res.json({
      success: true,
      message: "Login successful",
      data: userResponse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

// Logout user (clear cookie)
exports.logout = (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.json({ success: true, message: "Logout successful" });
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: AnggotaSilat,
          as: "anggotaSilat",
          required: false,
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nama, alamat, no_hp, foto, foto_url } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update only allowed fields
    const updateData = {};
    if (nama) updateData.nama = nama;
    if (alamat !== undefined) updateData.alamat = alamat;
    if (no_hp !== undefined) updateData.no_hp = no_hp;
    if (foto !== undefined) updateData.foto = foto;
    if (foto_url !== undefined) updateData.foto_url = foto_url;

    await user.update(updateData);

    // Fetch updated user without password
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: AnggotaSilat,
          as: "anggotaSilat",
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password (will be hashed automatically by User model hook)
    await user.update({ password: newPassword });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error changing password",
      error: error.message,
    });
  }
};

// Verify token (for frontend to check if token is still valid)
exports.verifyToken = async (req, res) => {
  try {
    // If we reach here, token is valid (middleware already verified it)
    res.json({
      success: true,
      message: "Token is valid",
      data: {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying token",
      error: error.message,
    });
  }
};

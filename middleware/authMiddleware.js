const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Authenticate - Verify JWT token
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please login to access this resource.",
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret_key",
    );

    // Check if user still exists
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error authenticating user",
      error: error.message,
    });
  }
};

// Authorize - Check if user has required role
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
    }

    next();
  };
};

// Optional authentication - Don't fail if no token, but attach user if token exists
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, continue without user
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your_jwt_secret_key",
      );

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      // Invalid token, but don't fail - just continue without user
      console.log("Optional auth: Invalid token, continuing without user");
    }

    next();
  } catch (error) {
    // Error in optional auth should not block the request
    next();
  }
};

// Check ownership - Verify user owns the resource
exports.checkOwnership = (Model, ownerField = "userId") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Admin can access everything
      if (userRole === "admin") {
        return next();
      }

      // Find resource
      const resource = await Model.findByPk(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
        });
      }

      // Check ownership
      if (resource[ownerField] !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not own this resource.",
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error checking ownership",
        error: error.message,
      });
    }
  };
};

// Rate limiting helper (simple in-memory implementation)
const loginAttempts = new Map();

exports.rateLimitLogin = (req, res, next) => {
  const email = req.body.email;

  if (!email) {
    return next();
  }

  const now = Date.now();
  const attempts = loginAttempts.get(email) || {
    count: 0,
    resetTime: now + 15 * 60 * 1000,
  }; // 15 minutes

  // Reset if time has passed
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + 15 * 60 * 1000;
  }

  // Check if too many attempts
  if (attempts.count >= 5) {
    const timeLeft = Math.ceil((attempts.resetTime - now) / 1000 / 60);
    return res.status(429).json({
      success: false,
      message: `Too many login attempts. Please try again in ${timeLeft} minutes.`,
    });
  }

  // Increment attempts
  attempts.count++;
  loginAttempts.set(email, attempts);

  next();
};

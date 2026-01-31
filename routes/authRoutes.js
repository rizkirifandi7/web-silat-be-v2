const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const {
  authenticate,
  rateLimitLogin,
} = require("../middleware/authMiddleware");

// Public routes
router.post("/register", authController.register);
router.post("/login", rateLimitLogin, authController.login);

// Protected routes
router.get("/profile", authenticate, authController.getProfile);
router.put("/profile", authenticate, authController.updateProfile);
router.put("/change-password", authenticate, authController.changePassword);
router.get("/verify", authenticate, authController.verifyToken);

module.exports = router;

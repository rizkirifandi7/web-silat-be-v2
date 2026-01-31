const express = require("express");
const router = express.Router();
const aboutController = require("../controllers/aboutController");
const {
  authenticate,
  authorize,
  optionalAuth,
} = require("../middleware/authMiddleware");
const { uploadImage } = require("../middleware/uploadMiddleware");

// Public routes
router.get("/", optionalAuth, aboutController.getAboutInfo);
router.get("/founders", optionalAuth, aboutController.getFounders);

// Admin only routes - with optional file upload
router.put(
  "/",
  authenticate,
  authorize("admin"),
  uploadImage.single("logo"),
  aboutController.updateAboutInfo,
);
router.post(
  "/founders",
  authenticate,
  authorize("admin"),
  uploadImage.single("photo"),
  aboutController.createFounder,
);
router.put(
  "/founders/:id",
  authenticate,
  authorize("admin"),
  uploadImage.single("photo"),
  aboutController.updateFounder,
);
router.delete(
  "/founders/:id",
  authenticate,
  authorize("admin"),
  aboutController.deleteFounder,
);

module.exports = router;

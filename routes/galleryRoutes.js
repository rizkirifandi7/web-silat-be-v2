const express = require("express");
const router = express.Router();
const galleryController = require("../controllers/galleryController");
const {
  authenticate,
  authorize,
  optionalAuth,
} = require("../middleware/authMiddleware");
const { uploadImage } = require("../middleware/uploadMiddleware");

// Public routes
router.get("/", optionalAuth, galleryController.getAllPhotos);
router.get("/:id", optionalAuth, galleryController.getPhotoById);

// Protected routes - require authentication
// Use uploadImage.single('photo') for file upload
router.post(
  "/",
  authenticate,
  authorize("admin", "anggota"),
  uploadImage.single("photo"),
  galleryController.uploadPhoto,
);
router.patch("/:id", authenticate, galleryController.updatePhoto);
router.delete("/:id", authenticate, galleryController.deletePhoto);

module.exports = router;

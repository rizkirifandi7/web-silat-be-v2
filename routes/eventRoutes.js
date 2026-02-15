const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const {
  authenticate,
  authorize,
  optionalAuth,
} = require("../middleware/authMiddleware");
const { uploadImage } = require("../middleware/uploadMiddleware");

// Public routes (with optional auth for enhanced data)
router.get("/", optionalAuth, eventController.getAllEvents);
router.get("/upcoming", optionalAuth, eventController.getUpcomingEvents);
router.get(
  "/organizer/:organizerId",
  optionalAuth,
  eventController.getEventsByOrganizer,
);
router.get("/:id", optionalAuth, eventController.getEventById);

// Protected routes - require authentication
router.post(
  "/",
  authenticate,
  authorize("admin", "anggota"),
  uploadImage.single("image"),
  eventController.createEvent,
);
router.patch(
  "/:id",
  authenticate,
  uploadImage.single("image"),
  eventController.updateEvent,
); // Will check ownership in controller
router.delete("/:id", authenticate, eventController.deleteEvent); // Will check ownership in controller

module.exports = router;

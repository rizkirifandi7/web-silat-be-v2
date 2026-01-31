const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const {
  authenticate,
  authorize,
  optionalAuth,
} = require("../middleware/authMiddleware");

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
  eventController.createEvent,
);
router.put("/:id", authenticate, eventController.updateEvent); // Will check ownership in controller
router.delete("/:id", authenticate, eventController.deleteEvent); // Will check ownership in controller

module.exports = router;

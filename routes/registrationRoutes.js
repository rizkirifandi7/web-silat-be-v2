const express = require("express");
const router = express.Router();
const registrationController = require("../controllers/registrationController");
const { authenticate, optionalAuth } = require("../middleware/authMiddleware");

// Public routes (with optional auth)
router.get(
  "/event/:eventId",
  optionalAuth,
  registrationController.getRegistrationsByEvent,
);
router.get(
  "/check/:eventId/:userId",
  optionalAuth,
  registrationController.checkRegistrationStatus,
);

// Protected routes - require authentication
router.post("/", authenticate, registrationController.registerToEvent);
router.post(
  "/with-payment",
  authenticate,
  registrationController.registerWithPayment,
);
router.get(
  "/user/:userId",
  authenticate,
  registrationController.getRegistrationsByUser,
);
router.put(
  "/:id",
  authenticate,
  registrationController.updateRegistrationStatus,
);
router.delete("/:id", authenticate, registrationController.cancelRegistration);

module.exports = router;

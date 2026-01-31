const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Public route - Midtrans webhook (no auth required)
router.post("/notification", paymentController.handleMidtransNotification);

// Protected routes - require authentication
router.post("/", authenticate, paymentController.createPayment);
router.get("/:id", authenticate, paymentController.getPaymentById);
router.get("/user/:userId", authenticate, paymentController.getPaymentsByUser);
router.get(
  "/status/:orderId",
  authenticate,
  paymentController.checkPaymentStatus,
);

// Admin only
router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  paymentController.updatePaymentStatus,
);

module.exports = router;

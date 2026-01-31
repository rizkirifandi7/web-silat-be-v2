const express = require("express");
const router = express.Router();
const donationCampaignController = require("../controllers/donationCampaignController");
const donationController = require("../controllers/donationController");
const {
  authenticate,
  authorize,
  optionalAuth,
} = require("../middleware/authMiddleware");
const { uploadImage } = require("../middleware/uploadMiddleware");

// ===== CAMPAIGN ROUTES =====

// Public routes
router.get(
  "/campaigns",
  optionalAuth,
  donationCampaignController.getAllCampaigns,
);
router.get(
  "/campaigns/:id",
  optionalAuth,
  donationCampaignController.getCampaignById,
);
router.get(
  "/campaigns/:id/donors",
  optionalAuth,
  donationCampaignController.getCampaignDonors,
);

// Protected routes - require authentication
router.post(
  "/campaigns",
  authenticate,
  authorize("admin", "anggota"),
  uploadImage.single("image"),
  donationCampaignController.createCampaign,
);
router.put(
  "/campaigns/:id",
  authenticate,
  donationCampaignController.updateCampaign,
);
router.delete(
  "/campaigns/:id",
  authenticate,
  donationCampaignController.deleteCampaign,
);
router.put(
  "/campaigns/:id",
  authenticate,
  donationCampaignController.updateCampaign,
);
router.delete(
  "/campaigns/:id",
  authenticate,
  donationCampaignController.deleteCampaign,
);

// ===== DONATION ROUTES =====

// Public routes
router.post("/", optionalAuth, donationController.createDonation); // Optional auth for anonymous donations
router.post("/notification", donationController.handleMidtransNotification); // Midtrans webhook

// Public stats
router.get("/stats", donationController.getDonationStats);

// Protected routes
router.get(
  "/",
  authenticate,
  authorize("admin"),
  donationController.getAllDonations,
); // Admin only
router.get("/:id", authenticate, donationController.getDonationById);
router.get("/user/:userId", authenticate, donationController.getUserDonations);

module.exports = router;

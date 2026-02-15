const express = require("express");
const router = express.Router();
const anggotaSilatController = require("../controllers/anggotaSilatController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Public routes
router.get("/stats", anggotaSilatController.getAnggotaStats);
router.get("/verify/:id", anggotaSilatController.verifyAnggota);

// Protected routes - require authentication
router.post(
  "/",
  authenticate,
  authorize("anggota"),
  anggotaSilatController.createAnggota,
);
router.get("/", authenticate, anggotaSilatController.getAllAnggota);
router.get("/:id", authenticate, anggotaSilatController.getAnggotaById);
router.get(
  "/user/:userId",
  authenticate,
  anggotaSilatController.getAnggotaByUserId,
);
router.patch("/:id", authenticate, anggotaSilatController.updateAnggota); // Will check ownership in controller
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  anggotaSilatController.deleteAnggota,
);

module.exports = router;

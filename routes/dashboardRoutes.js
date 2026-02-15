const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Protected routes (Admin/Pengurus only ideally, but 'admin' for now)
router.use(authenticate);
router.use(authorize("admin"));

router.get("/stats", dashboardController.getStats);

module.exports = router;

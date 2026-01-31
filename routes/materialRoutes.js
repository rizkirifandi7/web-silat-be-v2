const express = require("express");
const router = express.Router();
const materialController = require("../controllers/materialController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const {
  uploadVideo,
  uploadDocument,
} = require("../middleware/uploadMiddleware");

// Middleware to choose upload type based on material type
const uploadMaterial = (req, res, next) => {
  const type = req.body.type || req.query.type;

  if (type === "video") {
    return uploadVideo.single("file")(req, res, next);
  } else {
    return uploadDocument.single("file")(req, res, next);
  }
};

// All routes require authentication (anggota only)
router.get(
  "/",
  authenticate,
  authorize("admin", "anggota"),
  materialController.getAllMaterials,
);
router.get(
  "/:id",
  authenticate,
  authorize("admin", "anggota"),
  materialController.getMaterialById,
);

// View and download tracking
router.post(
  "/:id/view",
  authenticate,
  authorize("admin", "anggota"),
  materialController.incrementView,
);
router.post(
  "/:id/download",
  authenticate,
  authorize("admin", "anggota"),
  materialController.incrementDownload,
);

// Admin only routes - with file upload
router.post(
  "/",
  authenticate,
  authorize("admin"),
  uploadMaterial,
  materialController.uploadMaterial,
);
router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  materialController.updateMaterial,
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  materialController.deleteMaterial,
);

module.exports = router;

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { uploadImage } = require("../middleware/uploadMiddleware");

// All routes are protected
router.use(authenticate);

// Admin-only routes
router.get("/", authorize("admin"), userController.getAllUsers);
router.post(
  "/",
  authorize("admin"),
  uploadImage.single("foto"),
  userController.createUser,
);
router.patch(
  "/:id",
  authorize("admin"),
  uploadImage.single("foto"),
  userController.updateUser,
);
router.delete("/:id", authorize("admin"), userController.deleteUser);

// Get user by id: allow admin or the user themselves
router.get("/:id", userController.getUserById);

module.exports = router;

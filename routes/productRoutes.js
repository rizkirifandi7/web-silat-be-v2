const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { uploadImage } = require("../middleware/uploadMiddleware");

// Public routes
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);

// Admin routes
router.post(
  "/",
  authenticate,
  authorize("admin"),
  uploadImage.single("image"),
  productController.createProduct,
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  uploadImage.single("image"),
  productController.updateProduct,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  productController.deleteProduct,
);

module.exports = router;

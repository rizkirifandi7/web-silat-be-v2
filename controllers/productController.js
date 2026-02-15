const { Product } = require("../models");
const { Op } = require("sequelize");

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const { kategori, search, page = 1, limit = 12 } = req.query;

    const where = { isActive: true };
    if (kategori && kategori !== "Semua") where.kategori = kategori;
    if (search) where.nama = { [Op.iLike]: `%${search}%` };

    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
};

// Create product (Admin only)
exports.createProduct = async (req, res) => {
  try {
    const { nama, kategori, harga, deskripsi, isNew } = req.body;

    if (!nama || !kategori || !harga) {
      return res.status(400).json({
        success: false,
        message: "Nama, kategori, and harga are required",
      });
    }

    // Handle image upload from multer/cloudinary
    const imageUrl = req.file ? req.file.path : null;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Product image is required",
      });
    }

    const product = await Product.create({
      nama,
      kategori,
      harga,
      deskripsi,
      imageUrl,
      isNew: isNew === "true" || isNew === true,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating product",
      error: error.message,
    });
  }
};

// Update product (Admin only)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const { nama, kategori, harga, deskripsi, isNew, isActive } = req.body;
    const updateData = {
      nama,
      kategori,
      harga,
      deskripsi,
      isNew: isNew === "true" || isNew === true,
      isActive: isActive === "true" || isActive === true,
    };

    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    await product.update(updateData);

    res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
};

// Delete product (Soft delete)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.update({ isActive: false });

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
};

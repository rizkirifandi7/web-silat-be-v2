const { LearningMaterial, User } = require("../models");
const { Op } = require("sequelize");

// Get all materials
exports.getAllMaterials = async (req, res) => {
  try {
    const { type, category, level, search, page = 1, limit = 20 } = req.query;

    const where = { isActive: true };
    if (type) where.type = type;
    if (category) where.category = category;
    if (level) where.level = level;
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const offset = (page - 1) * limit;

    const { count, rows } = await LearningMaterial.findAndCountAll({
      where,
      include: [{ model: User, as: "uploader", attributes: ["id", "nama"] }],
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
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching materials",
        error: error.message,
      });
  }
};

// Get material by ID
exports.getMaterialById = async (req, res) => {
  try {
    const material = await LearningMaterial.findByPk(req.params.id, {
      include: [{ model: User, as: "uploader", attributes: ["id", "nama"] }],
    });

    if (!material) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    res.json({ success: true, data: material });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching material",
        error: error.message,
      });
  }
};

// Upload material (WITH MULTER - admin only)
exports.uploadMaterial = async (req, res) => {
  try {
    const { title, description, type, category, level, duration, accessLevel } =
      req.body;
    const uploadedBy = req.user.userId;

    if (!title || !type) {
      return res
        .status(400)
        .json({ success: false, message: "Title and type are required" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "File is required" });
    }

    // Get file info from Cloudinary upload
    const fileUrl = req.file.path;
    const fileSize = req.file.size;

    // Generate thumbnail for videos
    let thumbnailUrl = null;
    if (type === "video") {
      thumbnailUrl = req.file.path.replace(
        "/upload/",
        "/upload/so_0,w_400,h_300,c_fill/",
      );
    }

    const material = await LearningMaterial.create({
      title,
      description,
      type,
      category: category || "lainnya",
      level: level || "all",
      fileUrl,
      thumbnailUrl,
      fileSize,
      duration: duration || null,
      uploadedBy,
      accessLevel: accessLevel || "anggota_only",
    });

    const materialWithDetails = await LearningMaterial.findByPk(material.id, {
      include: [{ model: User, as: "uploader", attributes: ["id", "nama"] }],
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Material uploaded successfully",
        data: materialWithDetails,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error uploading material",
        error: error.message,
      });
  }
};

// Update material (admin only)
exports.updateMaterial = async (req, res) => {
  try {
    const material = await LearningMaterial.findByPk(req.params.id);

    if (!material) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    await material.update(req.body);

    const updatedMaterial = await LearningMaterial.findByPk(material.id, {
      include: [{ model: User, as: "uploader", attributes: ["id", "nama"] }],
    });

    res.json({
      success: true,
      message: "Material updated successfully",
      data: updatedMaterial,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating material",
        error: error.message,
      });
  }
};

// Delete material (admin only)
exports.deleteMaterial = async (req, res) => {
  try {
    const material = await LearningMaterial.findByPk(req.params.id);

    if (!material) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    await material.update({ isActive: false });

    res.json({ success: true, message: "Material deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error deleting material",
        error: error.message,
      });
  }
};

// Increment view count
exports.incrementView = async (req, res) => {
  try {
    const material = await LearningMaterial.findByPk(req.params.id);

    if (!material) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    await material.increment("viewCount");

    res.json({ success: true, message: "View count incremented" });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error incrementing view count",
        error: error.message,
      });
  }
};

// Increment download count
exports.incrementDownload = async (req, res) => {
  try {
    const material = await LearningMaterial.findByPk(req.params.id);

    if (!material) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    await material.increment("downloadCount");

    res.json({ success: true, message: "Download count incremented" });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error incrementing download count",
        error: error.message,
      });
  }
};

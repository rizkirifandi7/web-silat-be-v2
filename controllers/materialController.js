const { LearningMaterial, User } = require("../models");
const { Op } = require("sequelize");
const { uploadToExternalAPI } = require("../services/uploadService");
const axios = require("axios");

// Get all materials
exports.getAllMaterials = async (req, res) => {
  try {
    const { type, category, sabuk, search, page = 1, limit = 20 } = req.query;

    const where = { isActive: true };
    if (type) where.type = type;
    if (category) where.category = category;
    if (sabuk) where.sabuk = sabuk;
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
    res.status(500).json({
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
    res.status(500).json({
      success: false,
      message: "Error fetching material",
      error: error.message,
    });
  }
};

// Upload material (WITH MULTER - admin only)
exports.uploadMaterial = async (req, res) => {
  try {
    const { title, description, type, category, sabuk, duration, accessLevel } =
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

    // Upload file to external API
    const uploadResult = await uploadToExternalAPI(req.file);

    // Get file info from external API upload
    const fileUrl = uploadResult.fileUrl;
    const fileSize = uploadResult.fileSize;

    // For videos, we can use a placeholder thumbnail or generate one later
    let thumbnailUrl = null;
    if (type === "video") {
      // You can implement thumbnail generation later if needed
      thumbnailUrl = null;
    }

    const material = await LearningMaterial.create({
      title,
      description,
      type,
      category: category || "lainnya",
      sabuk: sabuk || "Belum punya",
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

    res.status(201).json({
      success: true,
      message: "Material uploaded successfully",
      data: materialWithDetails,
      uploadInfo: {
        fileName: uploadResult.fileName,
        fileType: uploadResult.fileType,
        fileSize: uploadResult.fileSize,
        fileId: uploadResult.fileId,
      },
    });
  } catch (error) {
    res.status(500).json({
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
    res.status(500).json({
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

    // Hapus file di cloud jika ada fileId (POST ke /file-entries/delete)
    let cloudDeleteSuccess = true;
    let cloudDeleteError = null;
    if (material.fileId) {
      try {
        await axios.post(
          `https://cloud.shelterdata.id/api/v1/file-entries/delete`,
          {
            entryIds: [String(material.fileId)],
            deleteForever: true,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.EXTERNAL_UPLOAD_API_TOKEN}`,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (err) {
        cloudDeleteSuccess = false;
        cloudDeleteError = err.response?.data || err.message;
        // Tambahkan log error detail ke console
        console.error("Cloud file delete error:", {
          fileId: material.fileId,
          error: err.response?.data || err.message,
          status: err.response?.status,
          headers: err.response?.headers,
        });
      }
    }

    await material.update({ isActive: false });

    res.json({
      success: true,
      message: "Material deleted successfully",
      cloudDeleteSuccess,
      cloudDeleteError,
    });
  } catch (error) {
    res.status(500).json({
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
    res.status(500).json({
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
    res.status(500).json({
      success: false,
      message: "Error incrementing download count",
      error: error.message,
    });
  }
};

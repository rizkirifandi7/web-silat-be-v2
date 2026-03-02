const { LearningMaterial, User } = require("../models");
const { Op } = require("sequelize");
const { cloudinary } = require("../middleware/uploadMiddleware");
const path = require("path");

/**
 * Helper: Upload a file buffer to Cloudinary using upload_stream.
 * This gives us full control over resource_type (video, raw, image, auto).
 * multer-storage-cloudinary does NOT support resource_type properly,
 * so we handle the upload manually here.
 */
function uploadToCloudinary(fileBuffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    stream.end(fileBuffer);
  });
}

/**
 * Determine Cloudinary resource_type from mimetype.
 * - video/* -> "video"
 * - everything else (pdf, doc, ppt) -> "raw"
 */
function getResourceType(mimetype) {
  if (mimetype && mimetype.startsWith("video/")) return "video";
  return "raw";
}

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

// Upload material (WITH MULTER memoryStorage + manual Cloudinary upload)
exports.uploadMaterial = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      sabuk,
      duration,
      accessLevel,
      fileUrl: bodyFileUrl,
    } = req.body;
    const uploadedBy = req.user.userId;

    if (!title || !type) {
      return res
        .status(400)
        .json({ success: false, message: "Title and type are required" });
    }

    let fileUrl = null;
    let fileSize = null;
    let fileId = null;
    let thumbnailUrl = null;
    let uploadInfo = null;

    if (req.file) {
      // Manual Cloudinary upload from memory buffer
      const resourceType = getResourceType(req.file.mimetype);

      console.log(
        `[Material Upload] Uploading "${req.file.originalname}" to Cloudinary | mimetype: ${req.file.mimetype} | resource_type: ${resourceType} | size: ${req.file.size} bytes`,
      );

      let publicId = `material_${Date.now()}`;
      if (resourceType === "raw" && req.file.originalname) {
        const ext = path.extname(req.file.originalname);
        if (ext) {
          publicId += ext;
        }
      }

      const cloudResult = await uploadToCloudinary(req.file.buffer, {
        folder: "silat/materials",
        resource_type: resourceType,
        public_id: publicId,
      });

      fileUrl = cloudResult.secure_url;
      fileSize = cloudResult.bytes || req.file.size;
      fileId = cloudResult.public_id;

      uploadInfo = {
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: cloudResult.bytes || req.file.size,
        fileId: cloudResult.public_id,
        cloudinaryUrl: cloudResult.secure_url,
      };

      console.log(`[Material Upload] Success! URL: ${cloudResult.secure_url}`);
    } else if (bodyFileUrl && bodyFileUrl.trim() !== "") {
      // URL mode — use provided URL directly
      fileUrl = bodyFileUrl.trim();
    } else {
      return res
        .status(400)
        .json({ success: false, message: "File or URL is required" });
    }

    // For videos, we can use a placeholder thumbnail or generate one later
    if (type === "video") {
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
      fileId,
      duration: duration || null,
      uploadedBy,
      accessLevel: accessLevel || "anggota_only",
    });

    const materialWithDetails = await LearningMaterial.findByPk(material.id, {
      include: [{ model: User, as: "uploader", attributes: ["id", "nama"] }],
    });

    const response = {
      success: true,
      message: "Material uploaded successfully",
      data: materialWithDetails,
    };

    if (uploadInfo) {
      response.uploadInfo = uploadInfo;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("[Material Upload] Error:", error);
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

    const {
      title,
      description,
      type,
      category,
      sabuk,
      duration,
      accessLevel,
      fileUrl: bodyFileUrl,
      isActive,
    } = req.body;

    let updateData = {
      title,
      description,
      type,
      category,
      sabuk,
      duration,
      accessLevel,
      isActive,
    };

    // Handle new file upload
    if (req.file) {
      const resourceType = getResourceType(req.file.mimetype);

      let publicId = `material_${Date.now()}`;
      if (resourceType === "raw" && req.file.originalname) {
        const ext = path.extname(req.file.originalname);
        if (ext) {
          publicId += ext;
        }
      }

      const cloudResult = await uploadToCloudinary(req.file.buffer, {
        folder: "silat/materials",
        resource_type: resourceType,
        public_id: publicId,
      });

      updateData.fileUrl = cloudResult.secure_url;
      updateData.fileSize = cloudResult.bytes || req.file.size;
      updateData.fileId = cloudResult.public_id;
      if (type === "video") {
        updateData.thumbnailUrl = null;
      }

      // Delete old file from Cloudinary if it exists
      if (material.fileId) {
        try {
          const oldResourceType = material.type === "video" ? "video" : "raw";
          await cloudinary.uploader.destroy(material.fileId, {
            resource_type: oldResourceType,
          });
        } catch (err) {
          console.error("Cloudinary old file delete error:", err);
        }
      }
    } else if (bodyFileUrl && bodyFileUrl.trim() !== "") {
      // URL Mode Update
      updateData.fileUrl = bodyFileUrl.trim();
      updateData.fileSize = null;

      // If material previously had a file, delete it from cloudinary
      if (material.fileId && material.fileUrl !== updateData.fileUrl) {
        try {
          const oldResourceType = material.type === "video" ? "video" : "raw";
          await cloudinary.uploader.destroy(material.fileId, {
            resource_type: oldResourceType,
          });
          updateData.fileId = null;
        } catch (err) {
          console.error("Cloudinary old file delete error:", err);
        }
      }
    }

    await material.update(updateData);

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

    // Hapus file dari Cloudinary
    let cloudDeleteSuccess = true;
    let cloudDeleteError = null;

    if (material.fileId) {
      try {
        const resourceType = material.type === "video" ? "video" : "raw";
        await cloudinary.uploader.destroy(material.fileId, {
          resource_type: resourceType,
        });
      } catch (err) {
        cloudDeleteSuccess = false;
        cloudDeleteError = err.message;
        console.error("Cloudinary file delete error:", err);
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

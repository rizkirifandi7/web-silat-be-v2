const { GalleryPhoto, User, Event } = require("../models");
const { Op } = require("sequelize");

// Get all photos
exports.getAllPhotos = async (req, res) => {
  try {
    const { category, eventId, search, page = 1, limit = 20 } = req.query;

    const where = { isActive: true };
    if (category) where.category = category;
    if (eventId) where.eventId = eventId;
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const offset = (page - 1) * limit;

    const { count, rows } = await GalleryPhoto.findAndCountAll({
      where,
      include: [
        { model: User, as: "uploader", attributes: ["id", "nama"] },
        {
          model: Event,
          as: "event",
          attributes: ["id", "title"],
          required: false,
        },
      ],
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
        message: "Error fetching photos",
        error: error.message,
      });
  }
};

// Get photo by ID
exports.getPhotoById = async (req, res) => {
  try {
    const photo = await GalleryPhoto.findByPk(req.params.id, {
      include: [
        { model: User, as: "uploader", attributes: ["id", "nama"] },
        {
          model: Event,
          as: "event",
          attributes: ["id", "title"],
          required: false,
        },
      ],
    });

    if (!photo) {
      return res
        .status(404)
        .json({ success: false, message: "Photo not found" });
    }

    res.json({ success: true, data: photo });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching photo",
        error: error.message,
      });
  }
};

// Upload photo (WITH MULTER)
exports.uploadPhoto = async (req, res) => {
  try {
    const { title, description, category, eventId, takenAt } = req.body;
    const uploadedBy = req.user.userId;

    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Photo file is required" });
    }

    // Get URLs from Cloudinary upload
    const photoUrl = req.file.path;
    const thumbnailUrl = req.file.path.replace(
      "/upload/",
      "/upload/c_thumb,w_200,h_200/",
    );

    const photo = await GalleryPhoto.create({
      title,
      description,
      category: category || "other",
      photoUrl,
      thumbnailUrl,
      uploadedBy,
      eventId,
      takenAt: takenAt || new Date(),
    });

    const photoWithDetails = await GalleryPhoto.findByPk(photo.id, {
      include: [{ model: User, as: "uploader", attributes: ["id", "nama"] }],
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Photo uploaded successfully",
        data: photoWithDetails,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error uploading photo",
        error: error.message,
      });
  }
};

// Update photo
exports.updatePhoto = async (req, res) => {
  try {
    const photo = await GalleryPhoto.findByPk(req.params.id);

    if (!photo) {
      return res
        .status(404)
        .json({ success: false, message: "Photo not found" });
    }

    if (photo.uploadedBy !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await photo.update(req.body);

    const updatedPhoto = await GalleryPhoto.findByPk(photo.id, {
      include: [{ model: User, as: "uploader", attributes: ["id", "nama"] }],
    });

    res.json({
      success: true,
      message: "Photo updated successfully",
      data: updatedPhoto,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating photo",
        error: error.message,
      });
  }
};

// Delete photo
exports.deletePhoto = async (req, res) => {
  try {
    const photo = await GalleryPhoto.findByPk(req.params.id);

    if (!photo) {
      return res
        .status(404)
        .json({ success: false, message: "Photo not found" });
    }

    if (photo.uploadedBy !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await photo.update({ isActive: false });

    res.json({ success: true, message: "Photo deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error deleting photo",
        error: error.message,
      });
  }
};

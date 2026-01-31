const { AboutSection, Founder, User } = require("../models");

// Get about info
exports.getAboutInfo = async (req, res) => {
  try {
    let aboutSection = await AboutSection.findOne({
      include: [
        {
          model: User,
          as: "editor",
          attributes: ["id", "nama"],
          required: false,
        },
      ],
    });

    // Create default if doesn't exist
    if (!aboutSection) {
      aboutSection = await AboutSection.create({});
    }

    const founders = await Founder.findAll({
      where: { isActive: true },
      order: [["order", "ASC"]],
    });

    res.json({
      success: true,
      data: {
        ...aboutSection.toJSON(),
        founders,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching about info",
        error: error.message,
      });
  }
};

// Update about info (WITH MULTER - admin only)
exports.updateAboutInfo = async (req, res) => {
  try {
    const { sejarah, visi, misi, filosofiLogo } = req.body;
    const updatedBy = req.user.userId;

    // Get logo URL from uploaded file if exists, otherwise use body
    const logoUrl = req.file ? req.file.path : req.body.logoUrl;

    let aboutSection = await AboutSection.findOne();

    if (!aboutSection) {
      aboutSection = await AboutSection.create({
        sejarah,
        visi,
        misi,
        filosofiLogo,
        logoUrl,
        updatedBy,
      });
    } else {
      await aboutSection.update({
        sejarah,
        visi,
        misi,
        filosofiLogo,
        logoUrl,
        updatedBy,
      });
    }

    const updatedAbout = await AboutSection.findOne({
      include: [
        {
          model: User,
          as: "editor",
          attributes: ["id", "nama"],
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      message: "About info updated successfully",
      data: updatedAbout,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating about info",
        error: error.message,
      });
  }
};

// Get founders
exports.getFounders = async (req, res) => {
  try {
    const founders = await Founder.findAll({
      where: { isActive: true },
      order: [["order", "ASC"]],
    });

    res.json({ success: true, data: founders });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching founders",
        error: error.message,
      });
  }
};

// Create founder (WITH MULTER - admin only)
exports.createFounder = async (req, res) => {
  try {
    const { nama, title, description, order } = req.body;

    if (!nama) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    // Get photo URL from uploaded file if exists, otherwise use body
    const photoUrl = req.file ? req.file.path : req.body.photoUrl;

    const founder = await Founder.create({
      nama,
      title,
      description,
      photoUrl,
      order: order || 0,
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Founder created successfully",
        data: founder,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error creating founder",
        error: error.message,
      });
  }
};

// Update founder (WITH MULTER - admin only)
exports.updateFounder = async (req, res) => {
  try {
    const founder = await Founder.findByPk(req.params.id);

    if (!founder) {
      return res
        .status(404)
        .json({ success: false, message: "Founder not found" });
    }

    // Get photo URL from uploaded file if exists, otherwise use body
    const updateData = { ...req.body };
    if (req.file) {
      updateData.photoUrl = req.file.path;
    }

    await founder.update(updateData);

    res.json({
      success: true,
      message: "Founder updated successfully",
      data: founder,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating founder",
        error: error.message,
      });
  }
};

// Delete founder (admin only)
exports.deleteFounder = async (req, res) => {
  try {
    const founder = await Founder.findByPk(req.params.id);

    if (!founder) {
      return res
        .status(404)
        .json({ success: false, message: "Founder not found" });
    }

    await founder.update({ isActive: false });

    res.json({ success: true, message: "Founder deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error deleting founder",
        error: error.message,
      });
  }
};

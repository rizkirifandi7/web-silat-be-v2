const { DonationCampaign, User, Donation } = require("../models");
const { Op } = require("sequelize");

// Get all campaigns
exports.getAllCampaigns = async (req, res) => {
  try {
    const {
      status,
      category,
      isUrgent,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (isUrgent !== undefined) where.isUrgent = isUrgent === "true";
    if (search) {
      where.title = { [Op.iLike]: `%${search}%` };
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await DonationCampaign.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "nama", "email"],
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
    res.status(500).json({
      success: false,
      message: "Error fetching campaigns",
      error: error.message,
    });
  }
};

// Get campaign by ID
exports.getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await DonationCampaign.findByPk(id, {
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "nama", "email"],
        },
        {
          model: Donation,
          as: "donations",
          where: { paymentStatus: "settlement" },
          required: false,
          limit: 10,
          order: [["paidAt", "DESC"]],
          attributes: [
            "id",
            "donorName",
            "amount",
            "message",
            "isAnonymous",
            "paidAt",
          ],
        },
      ],
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Get total donors count
    const totalDonors = await Donation.count({
      where: {
        campaignId: id,
        paymentStatus: "settlement",
      },
    });

    const response = campaign.toJSON();
    response.totalDonors = totalDonors;

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching campaign",
      error: error.message,
    });
  }
};

// Create campaign (WITH MULTER)
exports.createCampaign = async (req, res) => {
  try {
    const { title, description, category, targetAmount, startDate, endDate } =
      req.body;
    const organizerId = req.user.userId;

    // Validation
    if (!title || !targetAmount) {
      return res.status(400).json({
        success: false,
        message: "Title and target amount are required",
      });
    }

    if (targetAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Target amount must be greater than 0",
      });
    }

    // Get image URL from uploaded file if exists
    const imageUrl = req.file ? req.file.path : req.body.imageUrl;

    const campaign = await DonationCampaign.create({
      title,
      description,
      category: category || "umum",
      targetAmount,
      startDate: startDate || new Date(),
      endDate,
      imageUrl,
      organizerId,
      status: "draft",
    });

    const campaignWithOrganizer = await DonationCampaign.findByPk(campaign.id, {
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "nama", "email"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      data: campaignWithOrganizer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating campaign",
      error: error.message,
    });
  }
};

// Update campaign
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const campaign = await DonationCampaign.findByPk(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Check ownership
    if (campaign.organizerId !== userId && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not own this campaign.",
      });
    }

    const updateData = req.body;
    delete updateData.organizerId; // Cannot change organizer
    delete updateData.currentAmount; // Cannot manually change current amount

    await campaign.update(updateData);

    const updatedCampaign = await DonationCampaign.findByPk(id, {
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "nama", "email"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Campaign updated successfully",
      data: updatedCampaign,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating campaign",
      error: error.message,
    });
  }
};

// Delete/Cancel campaign
// Delete/Cancel campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const campaign = await DonationCampaign.findByPk(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Check ownership
    if (campaign.organizerId !== userId && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not own this campaign.",
      });
    }

    // Check for existing donations
    const donationCount = await Donation.count({
      where: { campaignId: id },
    });

    if (donationCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete campaign with existing donations. Please cancel it instead.",
      });
    }

    await campaign.destroy();

    res.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting campaign",
      error: error.message,
    });
  }
};

// Get campaign donors
exports.getCampaignDonors = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows } = await Donation.findAndCountAll({
      where: {
        campaignId: id,
        paymentStatus: "settlement",
      },
      attributes: [
        "id",
        "donorName",
        "amount",
        "message",
        "isAnonymous",
        "paidAt",
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["paidAt", "DESC"]],
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
      message: "Error fetching donors",
      error: error.message,
    });
  }
};

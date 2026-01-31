const { Donation, DonationCampaign, User, sequelize } = require("../models");
const midtransClient = require("midtrans-client");

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Generate unique order ID
const generateOrderId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `DONATION-${timestamp}-${random}`;
};

// Create donation
exports.createDonation = async (req, res) => {
  try {
    const {
      campaignId,
      amount,
      donorName,
      donorEmail,
      donorPhone,
      message,
      isAnonymous,
      paymentMethod,
    } = req.body;
    const userId = req.user ? req.user.userId : null;

    // Validation
    if (!amount || !donorName || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Amount, donor name, and payment method are required",
      });
    }

    if (amount < 1000) {
      return res.status(400).json({
        success: false,
        message: "Minimum donation amount is Rp 1.000",
      });
    }

    // Validate campaign if provided
    if (campaignId) {
      const campaign = await DonationCampaign.findByPk(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: "Campaign not found",
        });
      }

      if (campaign.status !== "active") {
        return res.status(400).json({
          success: false,
          message: "Campaign is not active",
        });
      }
    }

    // Generate order ID
    const orderId = generateOrderId();

    // Create donation record
    const donation = await Donation.create({
      campaignId: campaignId || null,
      userId,
      donorName,
      donorEmail,
      donorPhone,
      amount,
      message,
      isAnonymous: isAnonymous || false,
      paymentMethod,
      paymentStatus: "pending",
      midtransOrderId: orderId,
    });

    // Prepare Midtrans transaction
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: parseInt(amount),
      },
      customer_details: {
        first_name: donorName,
        email: donorEmail || "noreply@donation.com",
        phone: donorPhone || "08123456789",
      },
      item_details: [
        {
          id: campaignId || "general",
          price: parseInt(amount),
          quantity: 1,
          name: campaignId
            ? `Donasi untuk Campaign #${campaignId}`
            : "Donasi Umum",
        },
      ],
    };

    // Create Midtrans transaction
    const transaction = await snap.createTransaction(parameter);

    res.status(201).json({
      success: true,
      message: "Donation created successfully",
      data: {
        donation: {
          id: donation.id,
          amount: donation.amount,
          donorName: donation.donorName,
          paymentStatus: donation.paymentStatus,
        },
        midtransToken: transaction.token,
        midtransRedirectUrl: transaction.redirect_url,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating donation",
      error: error.message,
    });
  }
};

// Handle Midtrans notification
exports.handleMidtransNotification = async (req, res) => {
  try {
    const notification = req.body;

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    // Find donation
    const donation = await Donation.findOne({
      where: { midtransOrderId: orderId },
    });

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    let paymentStatus = "pending";

    if (transactionStatus == "capture") {
      if (fraudStatus == "accept") {
        paymentStatus = "settlement";
      }
    } else if (transactionStatus == "settlement") {
      paymentStatus = "settlement";
    } else if (
      transactionStatus == "cancel" ||
      transactionStatus == "deny" ||
      transactionStatus == "expire"
    ) {
      paymentStatus = transactionStatus;
    } else if (transactionStatus == "pending") {
      paymentStatus = "pending";
    }

    // Update donation
    await donation.update({
      paymentStatus,
      midtransTransactionId: notification.transaction_id,
      paidAt: paymentStatus === "settlement" ? new Date() : null,
    });

    res.json({
      success: true,
      message: "Notification processed",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing notification",
      error: error.message,
    });
  }
};

// Get all donations (admin only)
exports.getAllDonations = async (req, res) => {
  try {
    const {
      campaignId,
      userId,
      paymentStatus,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};
    if (campaignId) where.campaignId = campaignId;
    if (userId) where.userId = userId;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const offset = (page - 1) * limit;

    const { count, rows } = await Donation.findAndCountAll({
      where,
      include: [
        {
          model: DonationCampaign,
          as: "campaign",
          attributes: ["id", "title"],
        },
        {
          model: User,
          as: "donor",
          attributes: ["id", "nama", "email"],
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
    res.status(500).json({
      success: false,
      message: "Error fetching donations",
      error: error.message,
    });
  }
};

// Get donation by ID
exports.getDonationById = async (req, res) => {
  try {
    const { id } = req.params;

    const donation = await Donation.findByPk(id, {
      include: [
        {
          model: DonationCampaign,
          as: "campaign",
          attributes: ["id", "title", "category"],
        },
        {
          model: User,
          as: "donor",
          attributes: ["id", "nama", "email"],
          required: false,
        },
      ],
    });

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    res.json({
      success: true,
      data: donation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching donation",
      error: error.message,
    });
  }
};

// Get user donations
exports.getUserDonations = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check authorization
    if (req.user.userId !== parseInt(userId) && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Donation.findAndCountAll({
      where: { userId },
      include: [
        {
          model: DonationCampaign,
          as: "campaign",
          attributes: ["id", "title", "category"],
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
      message: "Error fetching user donations",
      error: error.message,
    });
  }
};

// Get donation statistics
exports.getDonationStats = async (req, res) => {
  try {
    // Total donations
    const totalDonations = await Donation.sum("amount", {
      where: { paymentStatus: "settlement" },
    });

    // Total donors
    const totalDonors = await Donation.count({
      where: { paymentStatus: "settlement" },
      distinct: true,
      col: "donorEmail",
    });

    // By category
    const byCategory = await sequelize.query(
      `
      SELECT dc.category, SUM(d.amount) as total
      FROM "Donations" d
      JOIN "DonationCampaigns" dc ON d."campaignId" = dc.id
      WHERE d."paymentStatus" = 'settlement'
      GROUP BY dc.category
    `,
      { type: sequelize.QueryTypes.SELECT },
    );

    // Recent donations
    const recentDonations = await Donation.findAll({
      where: { paymentStatus: "settlement" },
      include: [
        {
          model: DonationCampaign,
          as: "campaign",
          attributes: ["id", "title"],
        },
      ],
      attributes: ["id", "donorName", "amount", "isAnonymous", "paidAt"],
      limit: 10,
      order: [["paidAt", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        totalDonations: totalDonations || 0,
        totalDonors,
        byCategory,
        recentDonations,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};

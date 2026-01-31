const { Payment, Event, User, EventRegistration } = require("../models");
const midtransClient = require("midtrans-client");

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: false, // Set to true for production
  serverKey: process.env.MIDTRANS_SERVER_KEY || "YOUR_SERVER_KEY",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "YOUR_CLIENT_KEY",
});

// Create payment and get Midtrans token
exports.createPayment = async (req, res) => {
  try {
    const { eventId, userId, paymentMethod } = req.body;

    // Validate required fields
    if (!eventId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: eventId, userId",
      });
    }

    // Get event details
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if event is paid
    if (event.isFree) {
      return res.status(400).json({
        success: false,
        message: "This event is free, no payment required",
      });
    }

    // Get user details
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate unique order ID
    const orderId = `EVENT-${eventId}-USER-${userId}-${Date.now()}`;

    // Create payment record
    const payment = await Payment.create({
      eventId,
      userId,
      amount: event.price,
      paymentMethod: paymentMethod || "other",
      paymentStatus: "pending",
      midtransOrderId: orderId,
    });

    // Prepare Midtrans transaction parameters
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: parseInt(event.price),
      },
      customer_details: {
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
      },
      item_details: [
        {
          id: `event-${eventId}`,
          price: parseInt(event.price),
          quantity: 1,
          name: event.title,
        },
      ],
    };

    // Create Midtrans transaction
    const transaction = await snap.createTransaction(parameter);

    res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: {
        payment,
        midtransToken: transaction.token,
        midtransRedirectUrl: transaction.redirect_url,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating payment",
      error: error.message,
    });
  }
};

// Midtrans notification handler (webhook)
exports.handleMidtransNotification = async (req, res) => {
  try {
    const notification = req.body;

    // Verify notification authenticity
    const statusResponse = await snap.transaction.notification(notification);

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    // Find payment by order ID
    const payment = await Payment.findOne({
      where: { midtransOrderId: orderId },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Update payment status based on Midtrans response
    let paymentStatus = "pending";

    if (transactionStatus === "capture") {
      if (fraudStatus === "accept") {
        paymentStatus = "capture";
      }
    } else if (transactionStatus === "settlement") {
      paymentStatus = "settlement";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      paymentStatus = transactionStatus;
    } else if (transactionStatus === "pending") {
      paymentStatus = "pending";
    }

    // Update payment
    await payment.update({
      paymentStatus,
      midtransTransactionId: statusResponse.transaction_id,
      paymentDate: paymentStatus === "settlement" ? new Date() : null,
      transactionId: statusResponse.transaction_id,
    });

    res.json({
      success: true,
      message: "Notification processed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing notification",
      error: error.message,
    });
  }
};

// Update payment status manually
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, transactionId, notes } = req.body;

    const payment = await Payment.findByPk(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const updateData = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (transactionId) updateData.transactionId = transactionId;
    if (notes) updateData.notes = notes;

    if (paymentStatus === "settlement" && !payment.paymentDate) {
      updateData.paymentDate = new Date();
    }

    await payment.update(updateData);

    res.json({
      success: true,
      message: "Payment status updated successfully",
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating payment status",
      error: error.message,
    });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Event,
          as: "event",
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching payment",
      error: error.message,
    });
  }
};

// Get payments by user
exports.getPaymentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const payments = await Payment.findAll({
      where: { userId },
      include: [
        {
          model: Event,
          as: "event",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user payments",
      error: error.message,
    });
  }
};

// Check payment status
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check with Midtrans
    const statusResponse = await snap.transaction.status(orderId);

    // Find payment in database
    const payment = await Payment.findOne({
      where: { midtransOrderId: orderId },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      data: {
        payment,
        midtransStatus: statusResponse,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking payment status",
      error: error.message,
    });
  }
};

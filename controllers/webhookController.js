const {
  Payment,
  Donation,
  Event,
  User,
  EventRegistration,
  DonationCampaign,
  sequelize,
} = require("../models");
const midtransClient = require("midtrans-client");

// Initialize Midtrans Snap (single instance)
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

/**
 * Unified Midtrans Webhook Handler
 *
 * Routes notification to the correct handler based on order_id prefix:
 * - "EVENT-"    → Event payment handler
 * - "DONATION-" → Donation payment handler
 */
exports.handleNotification = async (req, res) => {
  try {
    const notification = req.body;
    let statusResponse;

    // For local testing, bypass Midtrans verification
    const isLocalTesting =
      process.env.NODE_ENV === "development" ||
      !process.env.MIDTRANS_SERVER_KEY;

    if (isLocalTesting) {
      statusResponse = notification;
    } else {
      statusResponse = await snap.transaction.notification(notification);
    }

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    // Determine payment status from Midtrans response
    let paymentStatus = "pending";

    if (transactionStatus === "capture") {
      if (fraudStatus === "accept") {
        paymentStatus = "settlement";
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

    // Route based on order ID prefix
    if (orderId.startsWith("EVENT-")) {
      await handleEventPayment(
        orderId,
        paymentStatus,
        statusResponse,
        res,
        isLocalTesting,
      );
    } else if (orderId.startsWith("DONATION-")) {
      await handleDonationPayment(
        orderId,
        paymentStatus,
        statusResponse,
        res,
        isLocalTesting,
      );
    } else {
      return res.status(400).json({
        success: false,
        message: `Unknown order type for order_id: ${orderId}`,
      });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing notification",
      error: error.message,
    });
  }
};

/**
 * Handle Event Payment settlement
 * - Update Payment status
 * - Auto-create EventRegistration if settlement
 * - Increment event registeredCount
 */
async function handleEventPayment(
  orderId,
  paymentStatus,
  statusResponse,
  res,
  isLocalTesting,
) {
  const t = await sequelize.transaction();

  try {
    const payment = await Payment.findOne({
      where: { midtransOrderId: orderId },
    });

    if (!payment) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Update payment record
    await payment.update(
      {
        paymentStatus,
        midtransTransactionId:
          statusResponse.transaction_id || `TEST-${Date.now()}`,
        paymentDate: paymentStatus === "settlement" ? new Date() : null,
        transactionId: statusResponse.transaction_id || `TEST-${Date.now()}`,
      },
      { transaction: t },
    );

    // Auto-register user to event after successful payment
    if (paymentStatus === "settlement") {
      const existingReg = await EventRegistration.findOne({
        where: { eventId: payment.eventId, userId: payment.userId },
      });

      if (!existingReg) {
        await EventRegistration.create(
          {
            eventId: payment.eventId,
            userId: payment.userId,
            paymentId: payment.id,
            status: "confirmed",
          },
          { transaction: t },
        );

        const event = await Event.findByPk(payment.eventId);
        if (event) {
          await event.increment("registeredCount", { transaction: t });
        }
      }
    }

    await t.commit();

    res.json({
      success: true,
      message: "Event payment notification processed",
      mode: isLocalTesting ? "local_testing" : "production",
      data: { orderId, paymentStatus, type: "event" },
    });
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * Handle Donation Payment settlement
 * - Update Donation status
 * - Donation model hook auto-increments campaign currentAmount
 */
async function handleDonationPayment(
  orderId,
  paymentStatus,
  statusResponse,
  res,
  isLocalTesting,
) {
  const donation = await Donation.findOne({
    where: { midtransOrderId: orderId },
  });

  if (!donation) {
    return res.status(404).json({
      success: false,
      message: "Donation not found",
    });
  }

  // Update donation record
  await donation.update({
    paymentStatus,
    midtransTransactionId:
      statusResponse.transaction_id || `TEST-${Date.now()}`,
    paidAt: paymentStatus === "settlement" ? new Date() : null,
  });

  res.json({
    success: true,
    message: "Donation payment notification processed",
    mode: isLocalTesting ? "local_testing" : "production",
    data: { orderId, paymentStatus, type: "donation" },
  });
}

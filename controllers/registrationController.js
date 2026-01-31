const { EventRegistration, Event, User, Payment } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../models").sequelize;

// Register to event
exports.registerToEvent = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { eventId, userId, notes } = req.body;

    // Validate required fields
    if (!eventId || !userId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Missing required fields: eventId, userId",
      });
    }

    // Check if event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if event is published
    if (event.status !== "published") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Event is not available for registration",
      });
    }

    // Check if already registered
    const existingRegistration = await EventRegistration.findOne({
      where: { eventId, userId },
    });

    if (existingRegistration) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "User already registered for this event",
      });
    }

    // Check capacity
    if (event.registeredCount >= event.capacity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Event is full",
      });
    }

    // For paid events, check if payment exists and is completed
    if (!event.isFree) {
      return res.status(400).json({
        success: false,
        message: "This is a paid event. Please complete payment first.",
        requiresPayment: true,
        eventPrice: event.price,
      });
    }

    // Create registration
    const registration = await EventRegistration.create(
      {
        eventId,
        userId,
        notes,
        status: "confirmed",
      },
      { transaction },
    );

    // Increment registered count
    await event.increment("registeredCount", { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Successfully registered to event",
      data: registration,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: "Error registering to event",
      error: error.message,
    });
  }
};

// Register with payment (for paid events)
exports.registerWithPayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { eventId, userId, paymentId, notes } = req.body;

    // Validate required fields
    if (!eventId || !userId || !paymentId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Missing required fields: eventId, userId, paymentId",
      });
    }

    // Check if payment is completed
    const payment = await Payment.findByPk(paymentId);
    if (!payment || payment.paymentStatus !== "settlement") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment not found or not completed",
      });
    }

    // Check if event exists
    const event = await Event.findByPk(eventId);
    if (!event) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check capacity
    if (event.registeredCount >= event.capacity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Event is full",
      });
    }

    // Create registration
    const registration = await EventRegistration.create(
      {
        eventId,
        userId,
        paymentId,
        notes,
        status: "confirmed",
      },
      { transaction },
    );

    // Increment registered count
    await event.increment("registeredCount", { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Successfully registered to event with payment",
      data: registration,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: "Error registering to event",
      error: error.message,
    });
  }
};

// Get registrations by user
exports.getRegistrationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const registrations = await EventRegistration.findAll({
      where: { userId },
      include: [
        {
          model: Event,
          as: "event",
          include: [
            {
              model: User,
              as: "organizer",
              attributes: ["id", "firstName", "lastName", "email"],
            },
          ],
        },
        {
          model: Payment,
          as: "payment",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user registrations",
      error: error.message,
    });
  }
};

// Get registrations by event
exports.getRegistrationsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const registrations = await EventRegistration.findAll({
      where: { eventId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Payment,
          as: "payment",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: registrations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching event registrations",
      error: error.message,
    });
  }
};

// Update registration status
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const registration = await EventRegistration.findByPk(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    await registration.update({ status });

    res.json({
      success: true,
      message: "Registration status updated successfully",
      data: registration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating registration status",
      error: error.message,
    });
  }
};

// Cancel registration
exports.cancelRegistration = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const registration = await EventRegistration.findByPk(id);

    if (!registration) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // Update registration status
    await registration.update({ status: "cancelled" }, { transaction });

    // Decrement registered count
    const event = await Event.findByPk(registration.eventId);
    await event.decrement("registeredCount", { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Registration cancelled successfully",
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: "Error cancelling registration",
      error: error.message,
    });
  }
};

// Check registration status
exports.checkRegistrationStatus = async (req, res) => {
  try {
    const { eventId, userId } = req.params;

    const registration = await EventRegistration.findOne({
      where: { eventId, userId },
    });

    if (!registration) {
      return res.json({
        success: true,
        isRegistered: false,
      });
    }

    res.json({
      success: true,
      isRegistered: true,
      data: registration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking registration status",
      error: error.message,
    });
  }
};

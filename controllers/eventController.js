const { Event, EventRegistration, Payment, User } = require("../models");
const { Op } = require("sequelize");

// Get all events with filtering
exports.getAllEvents = async (req, res) => {
  try {
    const {
      status,
      isFree,
      eventType,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};

    if (status) where.status = status;
    if (isFree !== undefined) where.isFree = isFree === "true";
    if (eventType) where.eventType = eventType;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Event.findAndCountAll({
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
      order: [["eventDate", "ASC"]],
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
      message: "Error fetching events",
      error: error.message,
    });
  }
};

// Get event by ID
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id, {
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "nama", "email"],
        },
        {
          model: EventRegistration,
          as: "registrations",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "nama", "email"],
            },
          ],
        },
      ],
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching event",
      error: error.message,
    });
  }
};

// Create new event
exports.createEvent = async (req, res) => {
  try {
    const eventData = req.body;

    // Add organizerId from authenticated user
    eventData.organizerId = req.user.userId;

    // Add image URL if uploaded
    if (req.file) {
      eventData.imageUrl = req.file.path;
    }

    // Validate required fields
    if (!eventData.title || !eventData.eventDate || !eventData.organizerId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, eventDate, organizerId",
      });
    }

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating event",
      error: error.message,
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Add image URL if uploaded
    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    const event = await Event.findByPk(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    await event.update(updateData);

    res.json({
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating event",
      error: error.message,
    });
  }
};

// Delete event (hard delete with safety check)
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id, {
      include: [
        {
          model: EventRegistration,
          as: "registrations",
        },
      ],
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if event has registrations
    if (event.registrations && event.registrations.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete event with existing registrations. Please cancel it instead.",
      });
    }

    await event.destroy();

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting event",
      error: error.message,
    });
  }
};

// Get upcoming events
exports.getUpcomingEvents = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const events = await Event.findAll({
      where: {
        eventDate: {
          [Op.gte]: new Date(),
        },
        status: "published",
      },
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "nama", "email"],
        },
      ],
      limit: parseInt(limit),
      order: [["eventDate", "ASC"]],
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching upcoming events",
      error: error.message,
    });
  }
};

// Get events by organizer
exports.getEventsByOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;

    const events = await Event.findAll({
      where: { organizerId },
      order: [["eventDate", "DESC"]],
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching organizer events",
      error: error.message,
    });
  }
};

const { User, AnggotaSilat, Event, EventRegistration } = require("../models");

exports.getStats = async (req, res) => {
  try {
    // Parallel fetching for performance
    const [totalUsers, totalMembers, totalEvents, recentRegistrations] =
      await Promise.all([
        User.count(),
        AnggotaSilat.count(),
        Event.count(),
        EventRegistration.findAll({
          limit: 5,
          order: [["createdAt", "DESC"]],
          include: [
            {
              model: Event,
              as: "event",
              attributes: ["title"],
            },
            {
              model: User,
              as: "user",
              attributes: ["nama", "email"],
            },
          ],
        }),
      ]);

    res.json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: {
        totalUsers,
        totalMembers,
        totalEvents,
        recentActivity: recentRegistrations,
      },
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard stats",
      error: error.message,
    });
  }
};

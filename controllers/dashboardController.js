const {
  User,
  AnggotaSilat,
  Event,
  EventRegistration,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");

exports.getStats = async (req, res) => {
  try {
    // Calculate date for 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Parallel fetching for performance
    const [
      totalUsers,
      totalMembers,
      totalEvents,
      recentRegistrations,
      registrationHistory,
    ] = await Promise.all([
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
      // registrationHistory: registrations per day for the last 7 days
      User.findAll({
        attributes: [
          [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: {
          createdAt: {
            [Op.gte]: sevenDaysAgo,
          },
        },
        group: [sequelize.fn("DATE", sequelize.col("createdAt"))],
        order: [[sequelize.fn("DATE", sequelize.col("createdAt")), "ASC"]],
        raw: true,
      }),
    ]);

    // Process registrationHistory to ensure all 7 days are present and formatted for the chart
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const historyMap = registrationHistory.reduce((acc, curr) => {
      const date = new Date(curr.date);
      acc[date.toISOString().split("T")[0]] = parseInt(curr.count);
      return acc;
    }, {});

    const formattedHistory = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateKey = d.toISOString().split("T")[0];
      formattedHistory.push({
        name: days[d.getDay()],
        value: historyMap[dateKey] || 0,
      });
    }

    res.json({
      success: true,
      message: "Dashboard stats fetched successfully",
      data: {
        totalUsers,
        totalMembers,
        totalEvents,
        recentActivity: recentRegistrations,
        registrationHistory: formattedHistory,
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

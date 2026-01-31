"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class DonationCampaign extends Model {
    static associate(models) {
      // Organizer relationship
      DonationCampaign.belongsTo(models.User, {
        foreignKey: "organizerId",
        as: "organizer",
      });

      // Donations relationship
      DonationCampaign.hasMany(models.Donation, {
        foreignKey: "campaignId",
        as: "donations",
      });
    }
  }

  DonationCampaign.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [5, 255],
        },
      },
      description: {
        type: DataTypes.TEXT,
      },
      category: {
        type: DataTypes.ENUM(
          "pendidikan",
          "kesehatan",
          "bencana",
          "infrastruktur",
          "umum",
        ),
        allowNull: false,
        defaultValue: "umum",
      },
      targetAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      currentAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      endDate: {
        type: DataTypes.DATE,
      },
      status: {
        type: DataTypes.ENUM("draft", "active", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "draft",
      },
      imageUrl: {
        type: DataTypes.TEXT,
      },
      organizerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      isUrgent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      // Virtual fields
      percentageReached: {
        type: DataTypes.VIRTUAL,
        get() {
          if (!this.targetAmount || this.targetAmount == 0) return 0;
          return Math.min(
            100,
            Math.round((this.currentAmount / this.targetAmount) * 100),
          );
        },
      },
      daysLeft: {
        type: DataTypes.VIRTUAL,
        get() {
          if (!this.endDate) return null;
          const now = new Date();
          const end = new Date(this.endDate);
          const diff = end - now;
          return Math.ceil(diff / (1000 * 60 * 60 * 24));
        },
      },
    },
    {
      sequelize,
      modelName: "DonationCampaign",
    },
  );

  return DonationCampaign;
};

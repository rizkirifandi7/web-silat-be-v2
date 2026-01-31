"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Event extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Organizer relationship
      Event.belongsTo(models.User, {
        foreignKey: "organizerId",
        as: "organizer",
      });

      // Registrations relationship
      Event.hasMany(models.EventRegistration, {
        foreignKey: "eventId",
        as: "registrations",
      });

      // Payments relationship
      Event.hasMany(models.Payment, {
        foreignKey: "eventId",
        as: "payments",
      });
    }
  }
  Event.init(
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
      eventType: {
        type: DataTypes.ENUM("seminar", "workshop", "conference", "webinar"),
        allowNull: false,
        defaultValue: "seminar",
      },
      eventDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: true,
          isAfterNow(value) {
            if (new Date(value) < new Date()) {
              throw new Error("Event date must be in the future");
            }
          },
        },
      },
      endDate: {
        type: DataTypes.DATE,
        validate: {
          isDate: true,
          isAfterStartDate(value) {
            if (
              value &&
              this.eventDate &&
              new Date(value) < new Date(this.eventDate)
            ) {
              throw new Error("End date must be after event date");
            }
          },
        },
      },
      location: {
        type: DataTypes.STRING,
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 1,
        },
      },
      registeredCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      isFree: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      status: {
        type: DataTypes.ENUM(
          "draft",
          "published",
          "ongoing",
          "completed",
          "cancelled",
        ),
        allowNull: false,
        defaultValue: "draft",
      },
      imageUrl: {
        type: DataTypes.STRING,
        validate: {
          isUrl: true,
        },
      },
      organizerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Event",
    },
  );
  return Event;
};

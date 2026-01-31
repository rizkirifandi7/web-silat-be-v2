"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class EventRegistration extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Event relationship
      EventRegistration.belongsTo(models.Event, {
        foreignKey: "eventId",
        as: "event",
      });

      // User relationship
      EventRegistration.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });

      // Payment relationship
      EventRegistration.belongsTo(models.Payment, {
        foreignKey: "paymentId",
        as: "payment",
      });
    }
  }
  EventRegistration.init(
    {
      eventId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      registrationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM("pending", "confirmed", "cancelled", "attended"),
        allowNull: false,
        defaultValue: "pending",
      },
      paymentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      sequelize,
      modelName: "EventRegistration",
    },
  );
  return EventRegistration;
};

"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Event relationship
      Payment.belongsTo(models.Event, {
        foreignKey: "eventId",
        as: "event",
      });

      // User relationship
      Payment.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });

      // Registration relationship
      Payment.hasOne(models.EventRegistration, {
        foreignKey: "paymentId",
        as: "registration",
      });
    }
  }
  Payment.init(
    {
      eventId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      paymentMethod: {
        type: DataTypes.ENUM(
          "bank_transfer",
          "credit_card",
          "gopay",
          "shopeepay",
          "qris",
          "other",
        ),
        allowNull: false,
      },
      paymentStatus: {
        type: DataTypes.ENUM(
          "pending",
          "settlement",
          "capture",
          "deny",
          "cancel",
          "expire",
          "failure",
          "refund",
        ),
        allowNull: false,
        defaultValue: "pending",
      },
      transactionId: {
        type: DataTypes.STRING,
      },
      paymentDate: {
        type: DataTypes.DATE,
      },
      paymentProof: {
        type: DataTypes.STRING,
      },
      midtransOrderId: {
        type: DataTypes.STRING,
        unique: true,
      },
      midtransTransactionId: {
        type: DataTypes.STRING,
      },
      notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      sequelize,
      modelName: "Payment",
    },
  );
  return Payment;
};

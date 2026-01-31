"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Donation extends Model {
    static associate(models) {
      // Campaign relationship
      Donation.belongsTo(models.DonationCampaign, {
        foreignKey: "campaignId",
        as: "campaign",
      });

      // Donor relationship
      Donation.belongsTo(models.User, {
        foreignKey: "userId",
        as: "donor",
      });
    }
  }

  Donation.init(
    {
      campaignId: {
        type: DataTypes.INTEGER,
      },
      userId: {
        type: DataTypes.INTEGER,
      },
      donorName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      donorEmail: {
        type: DataTypes.STRING,
        validate: {
          isEmail: true,
        },
      },
      donorPhone: {
        type: DataTypes.STRING,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
          min: 1000, // Minimum donation 1000
        },
      },
      message: {
        type: DataTypes.TEXT,
      },
      isAnonymous: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
          "cancel",
          "expire",
          "failure",
        ),
        allowNull: false,
        defaultValue: "pending",
      },
      transactionId: {
        type: DataTypes.STRING,
        unique: true,
      },
      midtransOrderId: {
        type: DataTypes.STRING,
        unique: true,
      },
      midtransTransactionId: {
        type: DataTypes.STRING,
      },
      paidAt: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: "Donation",
      hooks: {
        afterUpdate: async (donation, options) => {
          // Update campaign currentAmount when payment is settled
          if (
            donation.changed("paymentStatus") &&
            donation.paymentStatus === "settlement" &&
            donation.campaignId
          ) {
            const campaign = await sequelize.models.DonationCampaign.findByPk(
              donation.campaignId,
            );
            if (campaign) {
              await campaign.increment("currentAmount", {
                by: parseFloat(donation.amount),
                transaction: options.transaction,
              });
            }
          }
        },
      },
    },
  );

  return Donation;
};

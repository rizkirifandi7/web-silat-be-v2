"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Donations", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      campaignId: {
        type: Sequelize.INTEGER,
        references: {
          model: "DonationCampaigns",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      donorName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      donorEmail: {
        type: Sequelize.STRING,
      },
      donorPhone: {
        type: Sequelize.STRING,
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
      },
      isAnonymous: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      paymentMethod: {
        type: Sequelize.ENUM(
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
        type: Sequelize.ENUM(
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
        type: Sequelize.STRING,
        unique: true,
      },
      midtransOrderId: {
        type: Sequelize.STRING,
        unique: true,
      },
      midtransTransactionId: {
        type: Sequelize.STRING,
      },
      paidAt: {
        type: Sequelize.DATE,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Donations");
  },
};

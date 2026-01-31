"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Payments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      eventId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Events",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
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
        type: Sequelize.STRING,
        unique: true,
      },
      paymentDate: {
        type: Sequelize.DATE,
      },
      paymentProof: {
        type: Sequelize.STRING,
      },
      midtransOrderId: {
        type: Sequelize.STRING,
        unique: true,
        comment: "Order ID generated for Midtrans",
      },
      midtransTransactionId: {
        type: Sequelize.STRING,
        comment: "Transaction ID from Midtrans response",
      },
      notes: {
        type: Sequelize.TEXT,
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
    await queryInterface.dropTable("Payments");
  },
};

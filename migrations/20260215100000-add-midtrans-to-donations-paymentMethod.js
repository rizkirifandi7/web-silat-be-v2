"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check dialect to handle ENUM updates correctly
    if (queryInterface.sequelize.getDialect() === "postgres") {
      // For PostgreSQL
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Donations_paymentMethod" ADD VALUE IF NOT EXISTS 'midtrans';`,
      );
    } else {
      // For MySQL
      await queryInterface.changeColumn("Donations", "paymentMethod", {
        type: Sequelize.ENUM(
          "bank_transfer",
          "credit_card",
          "gopay",
          "shopeepay",
          "qris",
          "other",
          "midtrans",
        ),
        allowNull: false,
      });
    }
  },
  async down(queryInterface, Sequelize) {
    // Downgrade logic if needed, but adding enum values is usually safe to leave
  },
};

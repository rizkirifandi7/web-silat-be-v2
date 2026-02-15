"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'midtrans' to the paymentMethod enum
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_Donations_paymentMethod" ADD VALUE IF NOT EXISTS 'midtrans';`,
    );
  },
  async down(queryInterface, Sequelize) {
    // Cannot remove enum value in Postgres easily, so just leave as is
  },
};

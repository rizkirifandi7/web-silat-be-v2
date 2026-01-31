"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("AboutSections", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      sejarah: {
        type: Sequelize.TEXT,
      },
      visi: {
        type: Sequelize.TEXT,
      },
      misi: {
        type: Sequelize.TEXT,
      },
      filosofiLogo: {
        type: Sequelize.TEXT,
      },
      logoUrl: {
        type: Sequelize.TEXT,
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
    await queryInterface.dropTable("AboutSections");
  },
};

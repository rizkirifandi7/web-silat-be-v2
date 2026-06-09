"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("LearningMaterials", "position", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Urutan tampilan materi",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("LearningMaterials", "position");
  },
};

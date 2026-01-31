"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("LearningMaterials", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
      },
      type: {
        type: Sequelize.ENUM("video", "document", "pdf"),
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM(
          "teknik_dasar",
          "jurus",
          "sejarah",
          "teori",
          "peraturan",
          "lainnya",
        ),
        allowNull: false,
        defaultValue: "lainnya",
      },
      level: {
        type: Sequelize.ENUM("beginner", "intermediate", "advanced", "all"),
        allowNull: false,
        defaultValue: "all",
      },
      fileUrl: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      thumbnailUrl: {
        type: Sequelize.TEXT,
      },
      fileSize: {
        type: Sequelize.INTEGER,
      },
      duration: {
        type: Sequelize.INTEGER,
      },
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      accessLevel: {
        type: Sequelize.ENUM("anggota_only", "admin_only"),
        allowNull: false,
        defaultValue: "anggota_only",
      },
      viewCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      downloadCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    await queryInterface.dropTable("LearningMaterials");
  },
};

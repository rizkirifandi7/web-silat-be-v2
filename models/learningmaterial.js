"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LearningMaterial extends Model {
    static associate(models) {
      LearningMaterial.belongsTo(models.User, {
        foreignKey: "uploadedBy",
        as: "uploader",
      });
    }
  }

  LearningMaterial.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      description: {
        type: DataTypes.TEXT,
      },
      type: {
        type: DataTypes.ENUM("video", "document", "pdf"),
        allowNull: false,
      },
      category: {
        type: DataTypes.ENUM(
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
        type: DataTypes.ENUM("beginner", "intermediate", "advanced", "all"),
        allowNull: false,
        defaultValue: "all",
      },
      fileUrl: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
          isUrl: true,
        },
      },
      thumbnailUrl: {
        type: DataTypes.TEXT,
        validate: {
          isUrl: true,
        },
      },
      fileSize: {
        type: DataTypes.INTEGER,
      },
      duration: {
        type: DataTypes.INTEGER,
      },
      uploadedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      accessLevel: {
        type: DataTypes.ENUM("anggota_only", "admin_only"),
        allowNull: false,
        defaultValue: "anggota_only",
      },
      viewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      downloadCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "LearningMaterial",
    },
  );

  return LearningMaterial;
};
